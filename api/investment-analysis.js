const SCORE_BANDS = [
  { label: "FD", return: 7, score: 10 },
  { label: "Nifty", return: 8.65, score: 25 },
  { label: "Real Estate", return: 13, score: 40 },
  { label: "BTC", return: 50.72, score: 55 },
  { label: "Gold", return: 58.77, score: 70 },
  { label: "Silver", return: 96.63, score: 85 }
];

const MARKET_CONFIG = {
  BTC: { symbol: "BTC-USD", fallback: 50.72 },
  Gold: { symbol: "GC=F", fallback: 58.77 },
  Silver: { symbol: "SI=F", fallback: 96.63 },
  Nifty: { symbol: "^NSEI", fallback: 8.65 }
};

const scoreFromReturn = (decisionReturn) => {
  if (decisionReturn == null || Number.isNaN(decisionReturn)) return null;
  const topBand = SCORE_BANDS[SCORE_BANDS.length - 1];

  if (decisionReturn < SCORE_BANDS[0].return) return 0;
  if (decisionReturn >= topBand.return) return 100;

  for (let idx = 0; idx < SCORE_BANDS.length - 1; idx += 1) {
    const lower = SCORE_BANDS[idx];
    const upper = SCORE_BANDS[idx + 1];
    if (decisionReturn >= lower.return && decisionReturn < upper.return) {
      return Math.round(
        lower.score + ((decisionReturn - lower.return) / (upper.return - lower.return)) * 15
      );
    }
  }

  return topBand.score;
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

const previousOrEqualOpenPrice = (prices, targetDate) => {
  const target = new Date(targetDate).getTime();
  const filtered = prices
    .filter((point) => Number.isFinite(point.open) && point.time <= target)
    .sort((a, b) => b.time - a.time);

  if (filtered.length > 0) return filtered[0].open;

  const earliestAfter = prices
    .filter((point) => Number.isFinite(point.open) && point.time > target)
    .sort((a, b) => a.time - b.time);

  return earliestAfter[0]?.open ?? null;
};

const fetchJsonWithHeaders = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
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

  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastError = null;

  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`;
      const payload = await fetchJsonWithHeaders(url);
      const result = payload?.chart?.result?.[0];
      const chartError = payload?.chart?.error;
      if (chartError) throw new Error(`${chartError?.description || chartError?.code || "unknown"}`);

      const timestamps = result?.timestamp || [];
      const opens = result?.indicators?.quote?.[0]?.open || [];
      if (!timestamps.length || !opens.length) throw new Error("market data missing");

      return timestamps.map((time, idx) => ({ time: time * 1000, open: opens[idx] }));
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Yahoo Finance fetch failed for ${symbol}: ${lastError?.message || "unknown error"}`);
};

const marketXirr = async (asset, purchaseFlows, sellDate) => {
  const { symbol, fallback } = MARKET_CONFIG[asset];

  try {
    const buyDates = purchaseFlows.map((item) => item.date);
    const earliestBuyDate = buyDates.reduce((min, date) => (date < min ? date : min), buyDates[0]);
    const history = await fetchYahooHistory(symbol, earliestBuyDate, sellDate);
    const sellPrice = previousOrEqualOpenPrice(history, sellDate);

    if (!Number.isFinite(sellPrice) || sellPrice <= 0) throw new Error(`invalid sell price: ${asset}`);

    let units = 0;
    const benchmarkCashflows = purchaseFlows.map((flow) => {
      const buyPrice = previousOrEqualOpenPrice(history, flow.date);
      if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
        throw new Error(`invalid buy price: ${asset} on ${flow.date}`);
      }
      const investedAmount = Math.abs(flow.amount);
      units += investedAmount / buyPrice;
      return { date: flow.date, amount: -investedAmount };
    });

    benchmarkCashflows.push({ date: sellDate, amount: units * sellPrice });
    const xirr = computeXirr(benchmarkCashflows);
    if (xirr == null) throw new Error(`xirr failed: ${asset}`);

    return { asset, xirrPercent: xirr * 100, source: `Yahoo Finance (${symbol})` };
  } catch (error) {
    return {
      asset,
      xirrPercent: fallback,
      source: `Fallback benchmark assumption (${error instanceof Error ? error.message : "market fetch failed"})`
    };
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

    const firstBuy = transactions.find((item) => item.amount < 0);
    const firstSell = transactions.find((item) => item.amount > 0);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (!firstBuy || !firstSell) {
      res.status(400).json({
        success: false,
        message: "Sale Data Required."
      });
      return;
    }

    if (firstSell.date > todayStr) {
      res.status(400).json({
        success: false,
        message: "First sale date must be less than or equal to today."
      });
      return;
    }

    const userXirr = computeXirr(transactions);
    if (userXirr == null) {
      res.status(400).json({ success: false, message: "Unable to compute XIRR for the provided cashflows." });
      return;
    }


    const purchaseFlows = transactions.filter((item) => item.amount < 0);

    const marketRows = await Promise.all([
      marketXirr("BTC", purchaseFlows, firstSell.date),
      marketXirr("Gold", purchaseFlows, firstSell.date),
      marketXirr("Silver", purchaseFlows, firstSell.date),
      marketXirr("Nifty", purchaseFlows, firstSell.date)
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
