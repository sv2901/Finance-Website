const SCORE_BANDS = [
  { label: "Below", return: 0, score: 0 },
  { label: "FD", return: 7, score: 10 },
  { label: "Nifty", return: 8.65, score: 25 },
  { label: "Real Estate", return: 13, score: 40 },
  { label: "BTC", return: 50.72, score: 55 },
  { label: "Gold", return: 58.77, score: 70 },
  { label: "Silver", return: 96.63, score: 85 },
  { label: "Above", return: 999, score: 100 }
];

const MARKET_CONFIG = {
  BTC: { symbol: "BTC-USD", fallback: 50.72 },
  Gold: { symbol: "GC=F", fallback: 58.77 },
  Silver: { symbol: "SI=F", fallback: 96.63 },
  Nifty: { symbol: "^NSEI", fallback: 8.65 }
};

const scoreFromReturn = (decisionReturn) => {
  if (decisionReturn == null || Number.isNaN(decisionReturn)) return null;
  let lower = SCORE_BANDS[0];
  let upper = SCORE_BANDS[SCORE_BANDS.length - 1];

  for (let idx = 0; idx < SCORE_BANDS.length - 1; idx += 1) {
    const current = SCORE_BANDS[idx];
    const next = SCORE_BANDS[idx + 1];
    if (decisionReturn >= current.return && decisionReturn <= next.return) {
      lower = current;
      upper = next;
      break;
    }
  }

  if (upper.return === lower.return) return lower.score;
  return Math.round(lower.score + ((decisionReturn - lower.return) / (upper.return - lower.return)) * 15);
};

const computeXirr = (cashflows, guess = 0.12) => {
  if (!cashflows.length) return null;
  const hasPositive = cashflows.some((item) => item.amount > 0);
  const hasNegative = cashflows.some((item) => item.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const start = new Date(cashflows[0].date);
  let rate = guess;

  for (let i = 0; i < 150; i += 1) {
    let npv = 0;
    let derivative = 0;

    cashflows.forEach((flow) => {
      const years = (new Date(flow.date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const base = (1 + rate) ** years;
      npv += flow.amount / base;
      derivative -= (years * flow.amount) / ((1 + rate) ** (years + 1));
    });

    if (!Number.isFinite(npv) || !Number.isFinite(derivative) || derivative === 0) return null;
    const next = rate - npv / derivative;
    if (Math.abs(next - rate) < 1e-8) return next;
    rate = next;
  }

  return null;
};

const nearestPrice = (prices, targetDate) => {
  const target = new Date(targetDate).getTime();
  let closest = null;
  let closestDiff = Number.POSITIVE_INFINITY;

  prices.forEach((point) => {
    const diff = Math.abs(point.time - target);
    if (Number.isFinite(point.close) && diff < closestDiff) {
      closest = point.close;
      closestDiff = diff;
    }
  });

  return closest;
};

const fetchYahooHistory = async (symbol, startDate, endDate) => {
  const start = Math.floor(new Date(startDate).getTime() / 1000) - 3 * 24 * 60 * 60;
  const end = Math.floor(new Date(endDate).getTime() / 1000) + 3 * 24 * 60 * 60;
  const query = new URLSearchParams({
    period1: String(start),
    period2: String(end),
    interval: "1d",
    events: "history"
  });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`market fetch failed: ${symbol}`);

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  if (!timestamps.length || !closes.length) throw new Error(`market data missing: ${symbol}`);

  return timestamps.map((time, idx) => ({ time: time * 1000, close: closes[idx] }));
};

const marketXirr = async (asset, buyDate, sellDate) => {
  const { symbol, fallback } = MARKET_CONFIG[asset];

  try {
    const history = await fetchYahooHistory(symbol, buyDate, sellDate);
    const buyPrice = nearestPrice(history, buyDate);
    const sellPrice = nearestPrice(history, sellDate);

    if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice) || buyPrice <= 0 || sellPrice <= 0) {
      throw new Error(`invalid prices: ${asset}`);
    }

    const xirr = computeXirr([
      { date: buyDate, amount: -buyPrice },
      { date: sellDate, amount: sellPrice }
    ]);

    if (xirr == null) throw new Error(`xirr failed: ${asset}`);

    return { asset, xirrPercent: xirr * 100, source: `Yahoo Finance (${symbol})` };
  } catch {
    return { asset, xirrPercent: fallback, source: "Fallback benchmark assumption" };
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  try {
    const transactions = [...(req.body?.transactions || [])]
      .filter((item) => item?.date && Number.isFinite(Number(item.amount)))
      .map((item) => ({ date: item.date, amount: Number(item.amount) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (transactions.length < 2) {
      res.status(400).json({ success: false, message: "Add at least one purchase and one sale transaction." });
      return;
    }

    const userXirr = computeXirr(transactions);
    if (userXirr == null) {
      res.status(400).json({ success: false, message: "Unable to compute XIRR for the provided cashflows." });
      return;
    }

    const firstBuy = transactions.find((item) => item.amount < 0);
    const firstSell = transactions.find((item) => item.amount > 0);
    if (!firstBuy || !firstSell) {
      res.status(400).json({
        success: false,
        message: "Cashflows must include at least one purchase (negative) and one sale (positive)."
      });
      return;
    }

    const marketRows = await Promise.all([
      marketXirr("BTC", firstBuy.date, firstSell.date),
      marketXirr("Gold", firstBuy.date, firstSell.date),
      marketXirr("Silver", firstBuy.date, firstSell.date),
      marketXirr("Nifty", firstBuy.date, firstSell.date)
    ]);

    const benchmarkRows = [
      { asset: "FD", xirrPercent: 7, source: "Fixed benchmark assumption" },
      marketRows.find((row) => row.asset === "Nifty"),
      { asset: "Real Estate", xirrPercent: 13, source: "Fixed benchmark assumption" },
      marketRows.find((row) => row.asset === "BTC"),
      marketRows.find((row) => row.asset === "Gold"),
      marketRows.find((row) => row.asset === "Silver")
    ].map((row) => ({ ...row, score: scoreFromReturn(row.xirrPercent) }));

    res.status(200).json({
      success: true,
      data: {
        buyDate: firstBuy.date,
        sellDate: firstSell.date,
        userXirrPercent: userXirr * 100,
        decisionScore: scoreFromReturn(userXirr * 100),
        benchmarkRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
}
