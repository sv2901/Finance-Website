import http from "node:http";

const PORT = Number.parseInt(process.env.ANALYSIS_API_PORT || "8787", 10);

const SCORE_BANDS = [
  { label: "FD", return: 7, score: 10 },
  { label: "Nifty", return: 8.65, score: 25 },
  { label: "Real Estate", return: 13, score: 40 },
  { label: "BTC", return: 50.72, score: 55 },
  { label: "Gold", return: 58.77, score: 70 },
  { label: "Silver", return: 96.63, score: 85 }
];

const MARKET_CONFIG = {
  BTC: { symbol: "BTC-USD", fallback: 50.72, quoteCurrency: "USD" },
  Gold: { symbol: "GC=F", fallback: 58.77, quoteCurrency: "USD" },
  Silver: { symbol: "SI=F", fallback: 96.63, quoteCurrency: "USD" },
  Nifty: { symbol: "^NSEI", fallback: 8.65, quoteCurrency: "INR" }
};

const USDINR_SYMBOL = "INR=X";

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

const fetchJsonWithHeaders = async (url) => {
  const retryDelaysMs = [0, 350, 800, 1500];

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

    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === retryDelaysMs.length - 1) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  throw new Error("HTTP request failed after retries");
};

const fetchYahooHistory = async (symbol, startDate, endDate) => {
  const start = Math.floor(new Date(startDate).getTime() / 1000) - 3 * 24 * 60 * 60;
  const end = Math.floor(new Date(endDate).getTime() / 1000) + 3 * 24 * 60 * 60;

  const queryVariants = [
    new URLSearchParams({
      period1: String(start),
      period2: String(end),
      interval: "1d",
      events: "history"
    }),
    new URLSearchParams({
      range: "10y",
      interval: "1d",
      events: "history"
    })
  ];

  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  let lastError = null;

  for (const host of hosts) {
    for (const query of queryVariants) {
      try {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`;
        const payload = await fetchJsonWithHeaders(url);
        const result = payload?.chart?.result?.[0];
        const chartError = payload?.chart?.error;
        if (chartError) throw new Error(`${chartError?.description || chartError?.code || "unknown"}`);

        const timestamps = result?.timestamp || [];
        const opens = result?.indicators?.quote?.[0]?.open || [];
        if (!timestamps.length || !opens.length) throw new Error("market data missing");

        const rows = timestamps
          .map((time, idx) => ({ time: time * 1000, open: opens[idx] }))
          .filter((item) => Number.isFinite(item.open))
          .filter((item) => item.time >= start - 365 * 24 * 60 * 60 * 1000 && item.time <= end + 365 * 24 * 60 * 60 * 1000);

        if (!rows.length) throw new Error("market data missing in date window");
        return rows;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(`Yahoo Finance fetch failed for ${symbol}: ${lastError?.message || "unknown error"}`);
};

const marketXirr = async (asset, purchaseFlows, sellDate, histories) => {
  const { symbol, fallback, quoteCurrency } = MARKET_CONFIG[asset];

  try {
    const history = histories[symbol];
    if (!Array.isArray(history) || history.length === 0) {
      throw new Error(`Yahoo Finance fetch failed for ${symbol}: HTTP 429 or blocked`);
    }
    const sellPrice = previousOrEqualOpenPrice(history, sellDate);

    if (!Number.isFinite(sellPrice) || sellPrice <= 0) throw new Error(`invalid sell price: ${asset}`);

    const fxHistory = quoteCurrency === "USD" ? histories[USDINR_SYMBOL] : null;
    if (quoteCurrency === "USD" && (!Array.isArray(fxHistory) || fxHistory.length === 0)) {
      throw new Error(`Yahoo Finance fetch failed for ${USDINR_SYMBOL}: HTTP 429 or blocked`);
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
          ? `Yahoo Finance (${symbol}, ${USDINR_SYMBOL})`
          : `Yahoo Finance (${symbol})`
    };
  } catch (error) {
    return {
      asset,
      xirrPercent: fallback,
      source: `Fallback benchmark assumption (${error instanceof Error ? error.message : "market fetch failed"})`
    };
  }
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/investment-analysis") {
    sendJson(res, 404, { success: false, message: "Not found" });
    return;
  }

  try {
    const body = await parseBody(req);
    const transactions = [...(body.transactions || [])]
      .filter((item) => item?.date && Number.isFinite(Number(item.amount)))
      .map((item) => ({ date: item.date, amount: Number(item.amount) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (transactions.length < 2) {
      sendJson(res, 400, { success: false, message: "Add at least one purchase and one sale transaction." });
      return;
    }

    const firstBuy = transactions.find((item) => item.amount < 0);
    const firstSell = transactions.find((item) => item.amount > 0);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (!firstBuy || !firstSell) {
      sendJson(res, 400, {
        success: false,
        message: "Sale Data Required."
      });
      return;
    }

    if (firstSell.date > todayStr) {
      sendJson(res, 400, {
        success: false,
        message: "First sale date must be less than or equal to today."
      });
      return;
    }

    const userXirr = computeXirr(transactions);
    if (userXirr == null) {
      sendJson(res, 400, { success: false, message: "Unable to compute XIRR for the provided cashflows." });
      return;
    }


    const purchaseFlows = transactions.filter((item) => item.amount < 0);
    const buyDates = purchaseFlows.map((item) => item.date);
    const earliestBuyDate = buyDates.reduce((min, date) => (date < min ? date : min), buyDates[0]);

    const histories = {};
    const symbolsToLoad = ["BTC-USD", "GC=F", "SI=F", "^NSEI", USDINR_SYMBOL];

    for (const symbol of symbolsToLoad) {
      try {
        histories[symbol] = await fetchYahooHistory(symbol, earliestBuyDate, firstSell.date);
      } catch {
        histories[symbol] = null;
      }
      await sleep(120);
    }

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
    ].map((row) => ({ ...row, score: scoreFromReturn(row.xirrPercent) }));

    sendJson(res, 200, {
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
    sendJson(res, 500, { success: false, message: error.message || "Server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Investment analysis API listening on http://0.0.0.0:${PORT}`);
});
