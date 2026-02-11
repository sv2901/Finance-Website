const SCORE_BANDS = [
  { label: "FD", return: 7, score: 10 },
  { label: "Nifty", return: 8.65, score: 25 },
  { label: "Real Estate", return: 13, score: 40 },
  { label: "BTC", return: 50.72, score: 55 },
  { label: "Gold", return: 58.77, score: 70 },
  { label: "Silver", return: 96.63, score: 85 }
];

const MARKET_CONFIG = {
  BTC: { provider: "coingecko", symbol: "bitcoin", fallback: 50.72, quoteCurrency: "USD" },
  Gold: { provider: "twelvedata", symbol: "XAUUSD", fallback: 58.77, quoteCurrency: "USD" },
  Silver: { provider: "twelvedata", symbol: "XAGUSD", fallback: 96.63, quoteCurrency: "USD" },
  Nifty: { provider: "twelvedata", symbol: "NSE:NIFTY", fallback: 8.65, quoteCurrency: "INR" }
};

const USDINR_CONFIG = { provider: "twelvedata", symbol: "USDINR" };
const CACHE_TTL_MS = 15 * 60 * 1000;
const MARKET_HISTORY_CACHE = new Map();
let hasLoggedApiEnv = false;

const TWELVE_DATA_SYMBOL_CANDIDATES = {
  XAUUSD: ["XAUUSD", "XAU/USD"],
  XAGUSD: ["XAGUSD", "XAG/USD"],
  "NSE:NIFTY": ["NSE:NIFTY", "NIFTY", "NSEI"],
  USDINR: ["USDINR", "USD/INR"]
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

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const logApiEnvOnce = () => {
  if (hasLoggedApiEnv) return;
  hasLoggedApiEnv = true;
  const twelveDataApiKey = process.env.TWELVE_DATA_API_KEY;
  const redactedKey = twelveDataApiKey
    ? `${twelveDataApiKey.slice(0, 4)}...${twelveDataApiKey.slice(-2)}`
    : "undefined";
  console.log("[market-data] TWELVE_DATA_API_KEY:", redactedKey);
};

const fetchJsonWithHeaders = async (url, context = "") => {
  const retryDelaysMs = [0, 500, 1200, 2200];

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    if (retryDelaysMs[attempt] > 0) await sleep(retryDelaysMs[attempt]);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (response.ok) return response.json();

    const responseText = await response.text();
    console.error(
      `[market-data] Request failed${context ? ` (${context})` : ""}: status=${response.status} url=${url} body=${responseText.slice(0, 300)}`
    );

    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === retryDelaysMs.length - 1) {
      throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 180) || "unknown error"}`);
    }
  }

  throw new Error("HTTP request failed after retries");
};

const toIsoDate = (dateStringOrDate) => {
  const date = new Date(dateStringOrDate);
  return date.toISOString().slice(0, 10);
};

const fetchCoinGeckoHistory = async (coinId, startDate, endDate) => {
  const from = Math.floor(new Date(startDate).getTime() / 1000) - 2 * 24 * 60 * 60;
  const to = Math.floor(new Date(endDate).getTime() / 1000) + 2 * 24 * 60 * 60;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  const payload = await fetchJsonWithHeaders(url);
  const prices = payload?.prices || [];
  if (!prices.length) throw new Error("CoinGecko market data missing");

  return prices
    .map((item) => ({ time: Number(item[0]), open: Number(item[1]) }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.open));
};

const fetchTwelveDataHistory = async (symbol, startDate, endDate) => {
  logApiEnvOnce();
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY is missing");

  const symbolCandidates = TWELVE_DATA_SYMBOL_CANDIDATES[symbol] || [symbol];
  let lastError = "unknown";

  for (const candidateSymbol of symbolCandidates) {
    try {
      const query = new URLSearchParams({
        symbol: candidateSymbol,
        interval: "1day",
        start_date: toIsoDate(startDate),
        end_date: toIsoDate(endDate),
        outputsize: "5000",
        apikey: apiKey
      });

      const url = `https://api.twelvedata.com/time_series?${query}`;
      const payload = await fetchJsonWithHeaders(url, `twelvedata:${candidateSymbol}`);
      if (payload?.status === "error") {
        lastError = payload?.message || payload?.code || "unknown";
        console.error(`[market-data] TwelveData payload error for ${candidateSymbol}: ${lastError}`);
        continue;
      }

      const values = payload?.values || [];
      if (!values.length) {
        lastError = "market data missing";
        console.error(`[market-data] TwelveData returned no values for ${candidateSymbol}`);
        continue;
      }

      return values
        .map((row) => ({
          time: new Date(row.datetime).getTime(),
          open: Number.parseFloat(row.open)
        }))
        .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.open));
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
      console.error(`[market-data] TwelveData fetch failed for ${candidateSymbol}: ${lastError}`);
    }
  }

  throw new Error(`TwelveData error for ${symbol}: ${lastError}`);
};

const fetchMarketHistory = async (config, startDate, endDate) => {
  if (config.provider === "coingecko") {
    return fetchCoinGeckoHistory(config.symbol, startDate, endDate);
  }
  if (config.provider === "twelvedata") {
    return fetchTwelveDataHistory(config.symbol, startDate, endDate);
  }
  throw new Error(`Unknown provider: ${config.provider}`);
};

const getCachedHistory = async (cacheKey, config, startDate, endDate) => {
  const now = Date.now();
  const cached = MARKET_HISTORY_CACHE.get(cacheKey);
  if (cached && now - cached.fetchedAt <= CACHE_TTL_MS) {
    return cached.rows;
  }

  const rows = await fetchMarketHistory(config, startDate, endDate);
  MARKET_HISTORY_CACHE.set(cacheKey, {
    rows,
    fetchedAt: now
  });
  return rows;
};

const preloadHistories = async (startDate, sellDate) => {
  const histories = {};

  const configs = {
    BTC: MARKET_CONFIG.BTC,
    Gold: MARKET_CONFIG.Gold,
    Silver: MARKET_CONFIG.Silver,
    Nifty: MARKET_CONFIG.Nifty,
    USDINR: USDINR_CONFIG
  };

  for (const [key, config] of Object.entries(configs)) {
    const cacheKey = `${config.provider}:${config.symbol}`;
    try {
      histories[config.symbol] = await getCachedHistory(cacheKey, config, startDate, sellDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "market fetch failed";
      console.error(`[market-data] Failed to load ${key} (${config.symbol}): ${message}`);
      histories[config.symbol] = { error: message };
    }
    await sleep(120);
  }

  return histories;
};

const marketXirr = async (asset, purchaseFlows, sellDate, histories) => {
  const { symbol, quoteCurrency } = MARKET_CONFIG[asset];

  try {
    const history = histories[symbol];
    if (!Array.isArray(history) || history.length === 0) {
      const historyError = history?.error ? ` (${history.error})` : "";
      throw new Error(`Market fetch failed for ${symbol}${historyError}`);
    }
    const sellPrice = previousOrEqualOpenPrice(history, sellDate);

    if (!Number.isFinite(sellPrice) || sellPrice <= 0) throw new Error(`invalid sell price: ${asset}`);

    const fxHistory = quoteCurrency === "USD" ? histories[USDINR_CONFIG.symbol] : null;
    if (quoteCurrency === "USD" && (!Array.isArray(fxHistory) || fxHistory.length === 0)) {
      throw new Error(`Market fetch failed for ${USDINR_CONFIG.symbol}: blocked or provider unavailable`);
    }

    let units = 0;
    const benchmarkCashflows = purchaseFlows.map((flow) => {
      const buyPrice = previousOrEqualOpenPrice(history, flow.date);
      if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
        throw new Error(`invalid buy price: ${asset} on ${flow.date}`);
      }

      const investedAmountInr = Math.abs(flow.amount);
      if (quoteCurrency === "USD") {
        const usdInrAtBuy = previousOrEqualOpenPrice(fxHistory, flow.date);
        if (!Number.isFinite(usdInrAtBuy) || usdInrAtBuy <= 0) {
          throw new Error(`invalid USDINR price on ${flow.date}`);
        }
        const investedUsd = investedAmountInr / usdInrAtBuy;
        units += investedUsd / buyPrice;
      } else {
        units += investedAmountInr / buyPrice;
      }

      return { date: flow.date, amount: -investedAmountInr };
    });

    const saleAmountInr = (() => {
      if (quoteCurrency === "USD") {
        const usdInrAtSell = previousOrEqualOpenPrice(fxHistory, sellDate);
        if (!Number.isFinite(usdInrAtSell) || usdInrAtSell <= 0) {
          throw new Error(`invalid USDINR price on ${sellDate}`);
        }
        return units * sellPrice * usdInrAtSell;
      }
      return units * sellPrice;
    })();

    benchmarkCashflows.push({ date: sellDate, amount: saleAmountInr });
    const xirr = computeXirr(benchmarkCashflows);
    if (xirr == null) throw new Error(`xirr failed: ${asset}`);

    return {
      asset,
      xirrPercent: xirr * 100,
      source:
        quoteCurrency === "USD"
          ? `Market data (${symbol}, ${USDINR_CONFIG.symbol})`
          : `Market data (${symbol})`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "market fetch failed";
    console.error(`[market-data] Benchmark unavailable for ${asset}: ${message}`);
    return {
      asset,
      xirrPercent: null,
      source: `Market data unavailable (${message})`
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
    const buyDates = purchaseFlows.map((item) => item.date);
    const earliestBuyDate = buyDates.reduce((min, date) => (date < min ? date : min), buyDates[0]);

    const histories = await preloadHistories(earliestBuyDate, firstSell.date);

    const marketRows = [];
    for (const asset of ["BTC", "Gold", "Silver", "Nifty"]) {
      marketRows.push(await marketXirr(asset, purchaseFlows, firstSell.date, histories));
    }

    const benchmarkRows = [
      { asset: "FD", xirrPercent: 7, source: "Fixed benchmark assumption" },
      marketRows.find((row) => row.asset === "Nifty"),
      { asset: "Real Estate", xirrPercent: 13, source: "Fixed benchmark assumption" },
      marketRows.find((row) => row.asset === "BTC"),
      marketRows.find((row) => row.asset === "Gold"),
      marketRows.find((row) => row.asset === "Silver")
    ].map((row) => ({
      ...row,
      score: row.xirrPercent == null ? null : scoreFromReturn(row.xirrPercent)
    }));

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
