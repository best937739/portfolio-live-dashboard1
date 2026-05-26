
// app/api/quotes/route.ts
// Next.js / Vercel API route for live portfolio quotes
// ------------------------------------------------------------
// Environment variables:
// ALPHA_VANTAGE_API_KEY=your_key
// SET_API_KEY=your_set_marketplace_key               // optional
// SET_QUOTE_BASE_URL=https://marketplace.set.or.th/api/public/delay-data/stock // optional
// FX_FALLBACK_USDTHB=32.61                           // optional
// QUOTE_CACHE_SECONDS=60                             // optional

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Quote = {
  price: number;
  currency: "USD" | "THB";
  changePct: number | null;
  source?: string;
};

type QuoteResponse = {
  asOf: string;
  fx: { USDTHB: number };
  quotes: Record<string, Quote>;
  warnings?: string[];
};

const US_SYMBOLS = new Set([
  "SGOV",
  "SCHD",
  "JEPQ",
  "O",
  "USHY",
  "SCHG",
  "SCHY",
  "VOO",
  "VIGI",
  "SE",
]);

const THAI_SYMBOLS = new Set([
  "HSHD23",
  "BRKB80",
  "NFLX80",
  "XIAOMI80",
  "SAWAD",
  "BTS-W8",
]);

const SNAPSHOT_FALLBACK_QUOTES: Record<string, Quote> = {
  SGOV: { price: 100.64, currency: "USD", changePct: 0.0, source: "snapshot" },
  SCHD: { price: 32.77, currency: "USD", changePct: -0.18, source: "snapshot" },
  JEPQ: { price: 60.5, currency: "USD", changePct: 0.48, source: "snapshot" },
  O: { price: 62.32, currency: "USD", changePct: 0.48, source: "snapshot" },
  USHY: { price: 37.05, currency: "USD", changePct: 0.15, source: "snapshot" },
  SCHG: { price: 34.47, currency: "USD", changePct: 0.29, source: "snapshot" },
  SCHY: { price: 32.45, currency: "USD", changePct: 0.06, source: "snapshot" },
  VOO: { price: 688.58, currency: "USD", changePct: 0.44, source: "snapshot" },
  VIGI: { price: 94.15, currency: "USD", changePct: 0.28, source: "snapshot" },
  SE: { price: 89.77, currency: "USD", changePct: 2.86, source: "snapshot" },
  HSHD23: { price: 6.85, currency: "THB", changePct: -1.44, source: "snapshot" },
  BRKB80: { price: 1.59, currency: "THB", changePct: 0.0, source: "snapshot" },
  NFLX80: { price: 2.86, currency: "THB", changePct: -1.38, source: "snapshot" },
  XIAOMI80: { price: 12.4, currency: "THB", changePct: -1.59, source: "snapshot" },
  SAWAD: { price: 21.7, currency: "THB", changePct: null, source: "snapshot" },
  "BTS-W8": { price: 0.01, currency: "THB", changePct: null, source: "snapshot" },
};

const cache = new Map<string, { expiresAt: number; data: QuoteResponse }>();

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const symbols = parseSymbols(url.searchParams.get("symbols"));

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Missing query parameter: symbols" },
      { status: 400 }
    );
  }

  const cacheKey = symbols.sort().join(",");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return withNoStore(NextResponse.json(cached.data));
  }

  const warnings: string[] = [];
  const requestedUS = symbols.filter((symbol) => US_SYMBOLS.has(symbol));
  const requestedThai = symbols.filter((symbol) => THAI_SYMBOLS.has(symbol));
  const unknown = symbols.filter((symbol) => !US_SYMBOLS.has(symbol) && !THAI_SYMBOLS.has(symbol));

  const fallbackFx = Number(process.env.FX_FALLBACK_USDTHB || "32.61");
  const [fx, usQuotes, thaiQuotes] = await Promise.all([
    getUsdThbFx(fallbackFx, warnings),
    getUsQuotes(requestedUS, warnings),
    getThaiQuotes(requestedThai, warnings),
  ]);

  const quotes: Record<string, Quote> = {};

  for (const symbol of symbols) {
    const liveQuote = usQuotes[symbol] || thaiQuotes[symbol];
    const fallbackQuote = SNAPSHOT_FALLBACK_QUOTES[symbol];

    if (liveQuote) {
      quotes[symbol] = liveQuote;
    } else if (fallbackQuote) {
      quotes[symbol] = fallbackQuote;
    }
  }

  if (unknown.length > 0) {
    warnings.push(`Unknown symbols ignored: ${unknown.join(", ")}`);
  }

  const data: QuoteResponse = {
    asOf: new Date().toISOString(),
    fx: { USDTHB: fx },
    quotes,
    warnings: warnings.length ? warnings : undefined,
  };

  const cacheSeconds = Math.max(10, Number(process.env.QUOTE_CACHE_SECONDS || "60"));
  cache.set(cacheKey, { expiresAt: Date.now() + cacheSeconds * 1000, data });

  return withNoStore(NextResponse.json(data));
}

function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 100);
}

async function getUsdThbFx(fallbackFx: number, warnings: string[]): Promise<number> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    warnings.push("ALPHA_VANTAGE_API_KEY missing; FX uses fallback.");
    return fallbackFx;
  }

  try {
    const endpoint = new URL("https://www.alphavantage.co/query");
    endpoint.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
    endpoint.searchParams.set("from_currency", "USD");
    endpoint.searchParams.set("to_currency", "THB");
    endpoint.searchParams.set("apikey", apiKey);

    const data = await fetchJson(endpoint.toString());
    const rate = Number(data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
    if (!Number.isFinite(rate) || rate <= 0) {
      warnings.push("FX provider did not return a valid USDTHB rate; fallback used.");
      return fallbackFx;
    }
    return rate;
  } catch (error) {
    warnings.push(`FX request failed; fallback used. ${formatError(error)}`);
    return fallbackFx;
  }
}

async function getUsQuotes(symbols: string[], warnings: string[]): Promise<Record<string, Quote>> {
  if (symbols.length === 0) return {};

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    warnings.push("ALPHA_VANTAGE_API_KEY missing; US quotes use snapshot fallback.");
    return {};
  }

  // Preferred: Alpha Vantage REALTIME_BULK_QUOTES, premium endpoint.
  // It accepts up to 100 tickers per request.
  try {
    const endpoint = new URL("https://www.alphavantage.co/query");
    endpoint.searchParams.set("function", "REALTIME_BULK_QUOTES");
    endpoint.searchParams.set("symbol", symbols.join(","));
    endpoint.searchParams.set("apikey", apiKey);

    const data = await fetchJson(endpoint.toString());
    const bulkQuotes = parseAlphaVantageBulkQuotes(data);

    if (Object.keys(bulkQuotes).length > 0) {
      return bulkQuotes;
    }

    warnings.push("Bulk quote endpoint returned no parsable quotes; trying GLOBAL_QUOTE fallback.");
  } catch (error) {
    warnings.push(`Bulk quote request failed; trying GLOBAL_QUOTE fallback. ${formatError(error)}`);
  }

  // Fallback: GLOBAL_QUOTE, one request per symbol.
  // This is less efficient and may hit rate limits on free plans.
  const results: Record<string, Quote> = {};
  for (const symbol of symbols) {
    try {
      const endpoint = new URL("https://www.alphavantage.co/query");
      endpoint.searchParams.set("function", "GLOBAL_QUOTE");
      endpoint.searchParams.set("symbol", symbol);
      endpoint.searchParams.set("apikey", apiKey);

      const data = await fetchJson(endpoint.toString());
      const quote = parseAlphaVantageGlobalQuote(data, symbol);
      if (quote) results[symbol] = quote;
    } catch (error) {
      warnings.push(`GLOBAL_QUOTE failed for ${symbol}; snapshot fallback used. ${formatError(error)}`);
    }
  }

  return results;
}

function parseAlphaVantageBulkQuotes(data: any): Record<string, Quote> {
  const rows = data?.data || data?.quotes || data?.["Realtime Bulk Quotes"] || [];
  if (!Array.isArray(rows)) return {};

  const results: Record<string, Quote> = {};
  for (const row of rows) {
    const symbol = String(row.symbol || row.Symbol || row.ticker || "").toUpperCase();
    const price = Number(row.price || row.close || row.last || row["05. price"]);
    const changePct = parsePercent(row.change_percent || row.changePercent || row["10. change percent"]);

    if (symbol && Number.isFinite(price) && price > 0) {
      results[symbol] = {
        price,
        currency: "USD",
        changePct,
        source: "alpha-vantage-bulk",
      };
    }
  }
  return results;
}

function parseAlphaVantageGlobalQuote(data: any, expectedSymbol: string): Quote | null {
  const quote = data?.["Global Quote"];
  if (!quote) return null;

  const symbol = String(quote["01. symbol"] || expectedSymbol).toUpperCase();
  const price = Number(quote["05. price"]);
  const changePct = parsePercent(quote["10. change percent"]);

  if (!symbol || !Number.isFinite(price) || price <= 0) return null;

  return {
    price,
    currency: "USD",
    changePct,
    source: "alpha-vantage-global-quote",
  };
}

async function getThaiQuotes(symbols: string[], warnings: string[]): Promise<Record<string, Quote>> {
  if (symbols.length === 0) return {};

  const setApiKey = process.env.SET_API_KEY;
  const setBaseUrl = process.env.SET_QUOTE_BASE_URL;

  if (!setApiKey || !setBaseUrl) {
    warnings.push("SET_API_KEY or SET_QUOTE_BASE_URL missing; Thai quotes use snapshot fallback.");
    return {};
  }

  try {
    // SET's stock quotation API accepts stockSymbol as a comma-separated list and api-key as a request header.
    const endpoint = new URL(setBaseUrl);
    endpoint.searchParams.set("stockSymbol", symbols.join(","));
    endpoint.searchParams.set("oddLotFlag", "false");

    const response = await fetch(endpoint.toString(), {
      headers: {
        Accept: "application/json",
        "api-key": setApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return parseSetStockQuotation(data, symbols);
  } catch (error) {
    warnings.push(`Thai quote request failed; snapshot fallback used. ${formatError(error)}`);
    return {};
  }
}

function parseSetStockQuotation(data: any, expectedSymbols: string[]): Record<string, Quote> {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.quotes) ? data.quotes : [];
  const wanted = new Set(expectedSymbols);
  const results: Record<string, Quote> = {};

  for (const row of rows) {
    const symbol = String(row?.symbol || row?.securitySymbol || "").toUpperCase();
    if (!wanted.has(symbol)) continue;

    const price = Number(row?.last ?? row?.lastPrice ?? row?.close);
    const prior = Number(row?.prior);

    if (!Number.isFinite(price) || price <= 0) continue;

    const changePct = Number.isFinite(prior) && prior > 0 ? ((price - prior) / prior) * 100 : null;
    results[symbol] = {
      price,
      currency: "THB",
      changePct,
      source: "set-market-data-api",
    };
  }

  return results;
}

function parsePercent(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace("%", "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  // Alpha Vantage often returns throttling/error messages as 200 OK.
  const note = data?.Note || data?.Information || data?.["Error Message"];
  if (note) {
    throw new Error(String(note));
  }

  return data;
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
