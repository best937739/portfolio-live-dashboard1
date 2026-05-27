"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  Activity,
  Banknote,
  CircleDollarSign,
  CloudOff,
  Landmark,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";

/**
 * Portfolio Website with Live Price Adapter
 * --------------------------------------------------
 * Frontend calls: GET /api/quotes?symbols=SGOV,SCHD,JEPQ,O,USHY,SCHG,SCHY,VOO,VIGI,SE,HSHD23,BRKB80,NFLX80,XIAOMI80,SAWAD,BTS-W8
 * If /api/quotes is not available, the app automatically falls back to screenshot prices.
 */

const SNAPSHOT_AS_OF = "26 May 2026, 23:16–23:19";
const FALLBACK_FX_USD_THB = 32.61;
const REFRESH_INTERVAL_MS = 60_000;

const liveAssets = [
  { ticker: "SGOV", name: "iShares 0-3 Month Treasury Bond ETF", account: "Dime US Stock", bucket: "Cash-like / T-Bill ETF", region: "US", currency: "USD", shares: 52.8555616, costTotal: 5318.38, fallbackPrice: 100.64 },
  { ticker: "SCHD", name: "Schwab US Dividend Equity ETF", account: "Dime US Stock", bucket: "Dividend equity", region: "US", currency: "USD", shares: 94.2741915, costTotal: 2672.29, fallbackPrice: 32.77 },
  { ticker: "JEPQ", name: "JPMorgan Nasdaq Equity Premium Income ETF", account: "Dime US Stock", bucket: "Covered-call / income equity", region: "US", currency: "USD", shares: 50.4299455, costTotal: 2852.89, fallbackPrice: 60.50 },
  { ticker: "O", name: "Realty Income", account: "Dime US Stock", bucket: "REIT", region: "US", currency: "USD", shares: 31.4046913, costTotal: 1817.69, fallbackPrice: 62.32 },
  { ticker: "USHY", name: "iShares Broad USD High Yield Corporate Bond ETF", account: "Dime US Stock", bucket: "High-yield bond ETF", region: "US", currency: "USD", shares: 24.8425602, costTotal: 927.51, fallbackPrice: 37.05 },
  { ticker: "SCHG", name: "Schwab US Large-Cap Growth ETF", account: "Dime US Stock", bucket: "Growth equity", region: "US", currency: "USD", shares: 17.0980768, costTotal: 499.20, fallbackPrice: 34.47 },
  { ticker: "SCHY", name: "Schwab International Dividend Equity ETF", account: "Dime US Stock", bucket: "International dividend", region: "Global ex-US", currency: "USD", shares: 15.8921276, costTotal: 497.20, fallbackPrice: 32.45 },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", account: "Dime US Stock", bucket: "US core index", region: "US", currency: "USD", shares: 0.6263721, costTotal: 400.00, fallbackPrice: 688.58 },
  { ticker: "VIGI", name: "Vanguard International Dividend Appreciation ETF", account: "Dime US Stock", bucket: "International dividend growth", region: "Global ex-US", currency: "USD", shares: 4.5078961, costTotal: 399.36, fallbackPrice: 94.15 },
  { ticker: "SE", name: "Sea Limited", account: "Dime US Stock", bucket: "Single stock", region: "Singapore / US-listed", currency: "USD", shares: 3.1969309, costTotal: 300.00, fallbackPrice: 89.77 },

  { ticker: "HSHD23", name: "HSHD23", account: "Dime Thai Stock", bucket: "Thai DR / equity", region: "Thailand", currency: "THB", shares: 2358, costTotal: 15091.20, fallbackPrice: 6.85 },
  { ticker: "BRKB80", name: "Berkshire Hathaway DR", account: "Dime Thai Stock", bucket: "Thai DR / equity", region: "Thailand", currency: "THB", shares: 6525, costTotal: 10570.50, fallbackPrice: 1.59 },
  { ticker: "NFLX80", name: "Netflix DR", account: "Dime Thai Stock", bucket: "Thai DR / equity", region: "Thailand", currency: "THB", shares: 3199, costTotal: 10044.86, fallbackPrice: 2.86 },
  { ticker: "XIAOMI80", name: "Xiaomi DR", account: "Dime Thai Stock", bucket: "Thai DR / equity", region: "Thailand", currency: "THB", shares: 645, costTotal: 10965.00, fallbackPrice: 12.40 },
  { ticker: "SAWAD", name: "Srisawad Corporation", account: "Thai broker", bucket: "Thai equity", region: "Thailand", currency: "THB", shares: 47, costTotal: null, fallbackPrice: 21.70 },
  { ticker: "BTS-W8", name: "BTS warrant", account: "Thai broker", bucket: "Thai warrant", region: "Thailand", currency: "THB", shares: 20, costTotal: null, fallbackPrice: 0.01 },

  { ticker: "SGOV", ..., fallbackPrice: 100.64, dividendYield: 4.6 },
  { ticker: "SCHD", ..., fallbackPrice: 32.77, dividendYield: 3.4 },
  { ticker: "JEPQ", ..., fallbackPrice: 60.50, dividendYield: 10.5 },
  { ticker: "O", ..., fallbackPrice: 62.32, dividendYield: 5.5 },
  { ticker: "USHY", ..., fallbackPrice: 37.05, dividendYield: 6.8 },
  { ticker: "SCHG", ..., fallbackPrice: 34.47, dividendYield: 0.7 },
  { ticker: "SCHY", ..., fallbackPrice: 32.45, dividendYield: 4.1 },
  { ticker: "VOO", ..., fallbackPrice: 688.58, dividendYield: 1.3 },
  { ticker: "VIGI", ..., fallbackPrice: 94.15, dividendYield: 2.2 },
  { ticker: "SE", ..., fallbackPrice: 89.77, dividendYield: 0.0 },
  ...
] as const;

const fixedAssets = [
  { ticker: "K-ESGBF-ThaiESG", name: "K ESG Bond Fund ThaiESG", account: "Dime TAX Fund", bucket: "ThaiESG bond fund", region: "Thailand", currency: "THB", valueTHB: 50025.89, costTHB: 50000.00, pnlTHB: 25.89, updateMode: "Daily NAV" },
  { ticker: "SCBRMS&P500", name: "SCB US Equity RMF", account: "Dime TAX Fund", bucket: "RMF S&P 500 equity", region: "US", currency: "THB", valueTHB: 32986.06, costTHB: 29999.97, pnlTHB: 2986.09, updateMode: "Daily NAV" },
  { ticker: "Fund", name: "Residual fund balance", account: "Dime Fund", bucket: "Other", region: "Thailand", currency: "THB", valueTHB: 3.12, costTHB: 1.52, pnlTHB: 1.60, updateMode: "Manual" },
] as const;

const initialCashAccounts = [
  { id: "dime-cash", name: "Dime Cash", account: "Dime", currency: "Mixed", valueTHB: 94680.91, note: "USD 2,903.38 + THB 1.69" },
  { id: "bbl-cash", name: "Bangkok Bank Cash", account: "Bangkok Bank", currency: "THB", valueTHB: 67000.00, note: "External bank cash" },
  { id: "set-cash", name: "Thai Broker Cash", account: "SET broker", currency: "THB", valueTHB: 77658.73, note: "Cash balance / line available" },
];

const defensiveTickers = new Set(["SGOV", "USHY", "K-ESGBF-ThaiESG"]);
const equityLikeTickers = new Set(["SCHD", "JEPQ", "O", "SCHG", "SCHY", "VOO", "VIGI", "SE", "HSHD23", "BRKB80", "NFLX80", "XIAOMI80", "SCBRMS&P500", "SAWAD", "BTS-W8"]);

const thb = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const thb2 = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

type Quote = { price: number; currency: "USD" | "THB"; changePct: number | null; source?: string };
type QuoteResponse = { asOf?: string; fx?: { USDTHB?: number }; quotes?: Record<string, Quote>; warnings?: string[] };

function sum(items: Array<{ valueTHB: number }>, key: "valueTHB" = "valueTHB") {
  return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

function groupBy(items: Array<{ valueTHB: number; [key: string]: any }>, key: string, total: number) {
  const groups = items.reduce<Record<string, number>>((acc, item) => {
    const label = item[key] || "Other";
    acc[label] = (acc[label] || 0) + item.valueTHB;
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([name, value]) => ({ name, value, weight: total ? value / total * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

function makeProjection(start: number, monthlyDca: number, annualReturn: number, years: number) {
  const rows = [];
  let value = start;
  const r = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      for (let m = 0; m < 12; m++) value = value * (1 + r) + monthlyDca;
    }
    rows.push({ year: y, value: Math.round(value) });
  }
  return rows;
}

function buildAssetsWithPrices(priceMap: Record<string, Quote> | undefined, fx: number) {
  const live = liveAssets.map((asset) => {
    const liveQuote = priceMap?.[asset.ticker];
    const price = Number(liveQuote?.price) || asset.fallbackPrice;
    const effectiveFx = asset.currency === "USD" ? fx : 1;
    const valueLocal = price * asset.shares;
    const valueTHB = valueLocal * effectiveFx;
    const costTHB = asset.costTotal == null ? null : asset.costTotal * effectiveFx;
    const pnlTHB = costTHB == null ? null : valueTHB - costTHB;
    const pnlPct = costTHB ? (pnlTHB! / costTHB) * 100 : null;
    return {
      ...asset,
      price,
      changePct: liveQuote?.changePct ?? null,
      valueLocal,
      valueTHB,
      costTHB,
      pnlTHB,
      pnlPct,
      updateMode: liveQuote ? liveQuote.source || "Live API" : "Snapshot fallback",
    };
  });

  const fixed = fixedAssets.map((asset) => ({
    ...asset,
    price: null,
    valueLocal: asset.valueTHB,
    costTHB: asset.costTHB,
    pnlPct: asset.costTHB ? (asset.pnlTHB / asset.costTHB) * 100 : null,
  }));

  return [...live, ...fixed];
}

async function fetchQuotes(): Promise<QuoteResponse> {
  const symbols = liveAssets.map((a) => a.ticker).join(",");
  const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Quote API failed: ${response.status}`);
  return response.json();
}

export default function PortfolioWebsite() {
  const dividendAnnual = assets.reduce((sum, a: any) => {
  const y = Number(a.dividendYield);
  return sum + (y > 0 ? a.valueTHB * (y / 100) : 0);
}, 0);

const dividendMonthly = dividendAnnual / 12;
  const [query, setQuery] = useState("");
  const [monthlyDca, setMonthlyDca] = useState(40000);
  const [annualReturn, setAnnualReturn] = useState(6);
  const [years, setYears] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [cashAccounts, setCashAccounts] = useState(initialCashAccounts);
  const [quoteState, setQuoteState] = useState({
    status: "snapshot",
    asOf: SNAPSHOT_AS_OF,
    fx: FALLBACK_FX_USD_THB,
    quotes: {} as Record<string, Quote>,
    error: null as string | null,
    warnings: [] as string[],
  });

  const refreshQuotes = useCallback(async () => {
    setQuoteState((prev) => ({ ...prev, status: prev.status === "live" ? "refreshing" : "loading", error: null }));
    try {
      const data = await fetchQuotes();
      setQuoteState({
        status: "live",
        asOf: data.asOf || new Date().toISOString(),
        fx: Number(data.fx?.USDTHB) || FALLBACK_FX_USD_THB,
        quotes: data.quotes || {},
        error: null,
        warnings: data.warnings || [],
      });
    } catch (error) {
      setQuoteState((prev) => ({
        ...prev,
        status: "fallback",
        asOf: prev.asOf || SNAPSHOT_AS_OF,
        fx: prev.fx || FALLBACK_FX_USD_THB,
        error: error instanceof Error ? error.message : "Live quote endpoint unavailable",
      }));
    }
  }, []);

  useEffect(() => {
    refreshQuotes();
  }, [refreshQuotes]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(refreshQuotes, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, refreshQuotes]);

  const assets = useMemo(() => buildAssetsWithPrices(quoteState.quotes, quoteState.fx), [quoteState.quotes, quoteState.fx]);
  const holdingValue = sum(assets);
  const cashValue = sum(cashAccounts);
  const totalValue = holdingValue + cashValue;
  const pnlVisible = assets.reduce((acc, item) => acc + (Number(item.pnlTHB) || 0), 0);
  const dimeUsdCashTHB = 94668.13;
  const dimeUsdCashInterestAnnual = dimeUsdCashTHB * 0.045;

  const equityLike = assets.filter((h) => equityLikeTickers.has(h.ticker)).reduce((acc, h) => acc + h.valueTHB, 0);
  const defensiveAssetValue = assets.filter((h) => defensiveTickers.has(h.ticker)).reduce((acc, h) => acc + h.valueTHB, 0);
  const cashAndDefensive = cashValue + defensiveAssetValue;

  const accountData = groupBy(
    [...assets, ...cashAccounts.map((c) => ({ ...c, account: c.name, bucket: "Cash", region: c.currency }))],
    "account",
    totalValue
  );

  const bucketData = [
    { name: "Equity-like", value: equityLike, weight: equityLike / totalValue * 100 },
    { name: "Cash / defensive income", value: cashAndDefensive, weight: cashAndDefensive / totalValue * 100 },
    { name: "Other", value: Math.max(totalValue - equityLike - cashAndDefensive, 0), weight: Math.max(totalValue - equityLike - cashAndDefensive, 0) / totalValue * 100 },
  ];

  const filteredAssets = assets.filter((h) => [h.ticker, h.name, h.bucket, h.account, h.region].join(" ").toLowerCase().includes(query.toLowerCase()));
  const projection = makeProjection(totalValue, Number(monthlyDca) || 0, Number(annualReturn) || 0, Number(years) || 0);
  const isLive = quoteState.status === "live" || quoteState.status === "refreshing";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="mb-3 rounded-full bg-slate-800 px-3 py-1 text-slate-200">Live Portfolio Dashboard</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Portfolio Snapshot</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Dashboard with live-price adapter. US/Thai quote endpoint is called through /api/quotes. If unavailable, values fall back to the latest screenshot data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={refreshQuotes} disabled={quoteState.status === "loading" || quoteState.status === "refreshing"}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant={autoRefresh ? "default" : "outline"} className="rounded-2xl" onClick={() => setAutoRefresh((v) => !v)}>
              Auto refresh {autoRefresh ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        <StatusCard quoteState={quoteState} isLive={isLive} />

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric
  title="Dividend projection (annual)"
  value={thb.format(dividendAnnual)}
  note={`${thb.format(dividendMonthly)} / month (estimate)`}
  icon={<Banknote className="h-5 w-5" />}
/>
          <Metric title="Total net worth tracked" value={thb.format(totalValue)} note="Holdings + cash accounts" icon={<Wallet className="h-5 w-5" />} />
          <Metric title="Cash" value={thb.format(cashValue)} note={`${pct.format(cashValue / totalValue * 100)}% of tracked portfolio`} icon={<Banknote className="h-5 w-5" />} />
          <Metric title="Visible unrealized P/L" value={thb.format(pnlVisible)} note="Excludes unknown cost basis positions" icon={<TrendingUp className="h-5 w-5" />} />
          <Metric title="Dime USD cash income" value={thb.format(dimeUsdCashInterestAnnual)} note="4.5% p.a. estimate before tax/FX effects" icon={<Landmark className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-slate-900 p-1 md:w-[780px]">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="holdings" className="rounded-xl">Holdings</TabsTrigger>
            <TabsTrigger value="cash" className="rounded-xl">Cash</TabsTrigger>
            <TabsTrigger value="projection" className="rounded-xl">Projection</TabsTrigger>
            <TabsTrigger value="api" className="rounded-xl">API</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Allocation by Account" subtitle="Account / wrapper concentration">
                <ResponsiveContainer width="100%" height={330}>
                  <PieChart>
                    <Pie data={accountData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={115} paddingAngle={3} />
                    <Tooltip formatter={(value) => thb.format(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Economic Exposure" subtitle="Equity-like versus cash/defensive income">
                <ResponsiveContainer width="100%" height={330}>
                  <BarChart data={bucketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: "#cbd5e1" }} />
                    <Tooltip formatter={(value) => thb.format(Number(value))} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <MiniCard title="Equity-like" value={thb.format(equityLike)} note={`${pct.format(equityLike / totalValue * 100)}%`} />
              <MiniCard title="Cash / defensive income" value={thb.format(cashAndDefensive)} note={`${pct.format(cashAndDefensive / totalValue * 100)}%`} />
              <MiniCard title="FX assumption" value={`1 USD = ${quoteState.fx.toFixed(2)} THB`} note={isLive ? "From quote API" : "Snapshot fallback"} />
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="mt-6">
            <Card className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Holdings</h2>
                    <p className="text-sm text-slate-400">Live prices update through API; fallback mode uses screenshot prices.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker/account/bucket" className="rounded-2xl border-slate-700 bg-slate-950 pl-9" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-left text-sm">
                    <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="py-3">Ticker</th>
                        <th>Name</th>
                        <th>Account</th>
                        <th>Price</th>
                        <th className="text-right">Shares</th>
                        <th className="text-right">Value</th>
                        <th className="text-right">Weight</th>
                        <th className="text-right">P/L</th>
                        <th className="text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((h) => {
                        const pnl = h.pnlTHB;
                        return (
                          <tr key={`${h.account}-${h.ticker}`} className="border-b border-slate-800 last:border-0">
                            <td className="py-4 font-semibold text-slate-50">{h.ticker}</td>
                            <td>
                              <div>{h.name}</div>
                              <div className="text-xs text-slate-500">{h.bucket}</div>
                            </td>
                            <td>{h.account}</td>
                            <td>{h.price ? `${h.currency === "USD" ? usd.format(h.price) : thb2.format(h.price)}` : "NAV / manual"}</td>
                            <td className="text-right">{"shares" in h && h.shares ? number.format(h.shares) : "—"}</td>
                            <td className="text-right font-medium">{thb.format(h.valueTHB)}</td>
                            <td className="text-right">{pct.format(h.valueTHB / totalValue * 100)}%</td>
                            <td className={`text-right ${pnl == null ? "text-slate-500" : pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {pnl == null ? "Cost unknown" : `${thb.format(pnl)} (${pnl >= 0 ? "+" : ""}${pct.format(h.pnlPct ?? 0)}%)`}
                            </td>
                            <td className="text-right"><Badge variant="outline" className="rounded-full border-slate-700 text-slate-300">{h.updateMode}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {cashAccounts.map((cash) => (
                <Card key={cash.id} className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center gap-2 text-slate-300"><Shield className="h-5 w-5" /> {cash.account}</div>
                    <div className="text-2xl font-semibold">{thb.format(cash.valueTHB)}</div>
                    <div className="mt-2 text-sm text-slate-400">{cash.note}</div>
                    <label className="mt-5 block text-sm text-slate-400">Manual cash value</label>
                    <Input
                      type="number"
                      value={cash.valueTHB}
                      onChange={(e) => setCashAccounts((rows) => rows.map((r) => r.id === cash.id ? { ...r, valueTHB: Number(e.target.value) || 0 } : r))}
                      className="mt-1 rounded-2xl border-slate-700 bg-slate-950"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-4 rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold">Cash income estimate</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Dime USD cash {thb.format(dimeUsdCashTHB)} at 4.5% p.a. ≈ {thb.format(dimeUsdCashInterestAnnual)} / year, or {thb.format(dimeUsdCashInterestAnnual / 12)} / month before tax, fees, FX movement, and rate changes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projection" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <Card className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /><h2 className="text-xl font-semibold">Assumptions</h2></div>
                  <label className="text-sm text-slate-300">Monthly DCA</label>
                  <Input type="number" value={monthlyDca} onChange={(e) => setMonthlyDca(Number(e.target.value) || 0)} className="mt-1 rounded-2xl border-slate-700 bg-slate-950" />
                  <label className="mt-4 block text-sm text-slate-300">Annual return (%)</label>
                  <Input type="number" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value) || 0)} className="mt-1 rounded-2xl border-slate-700 bg-slate-950" />
                  <label className="mt-4 block text-sm text-slate-300">Years</label>
                  <Input type="number" value={years} onChange={(e) => setYears(Number(e.target.value) || 0)} className="mt-1 rounded-2xl border-slate-700 bg-slate-950" />
                </CardContent>
              </Card>

              <ChartCard title="Long-term Projection" subtitle="Simple compounding model; not a forecast" className="lg:col-span-3">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={projection}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: "#cbd5e1" }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000000)}M`} tick={{ fill: "#cbd5e1" }} />
                    <Tooltip formatter={(value) => thb.format(Number(value))} />
                    <Line type="monotone" dataKey="value" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
              <CardContent className="space-y-4 p-6 text-sm leading-6 text-slate-300">
                <h2 className="text-xl font-semibold text-slate-50">Live API setup</h2>
                <p>Frontend is wired to call <code className="rounded bg-slate-950 px-1">/api/quotes</code> every 60 seconds. Keep API keys in <code className="rounded bg-slate-950 px-1">.env.local</code>.</p>
                <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-300">
                  <div>GET /api/quotes?symbols=SGOV,SCHD,JEPQ,O,USHY,SCHG,SCHY,VOO,VIGI,SE,HSHD23,BRKB80,NFLX80,XIAOMI80,SAWAD,BTS-W8</div>
                  <br />
                  <div>{`{`}</div>
                  <div>{`  "asOf": "2026-05-26T16:20:00.000Z",`}</div>
                  <div>{`  "fx": { "USDTHB": 32.61 },`}</div>
                  <div>{`  "quotes": {`}</div>
                  <div>{`    "SGOV": { "price": 100.64, "currency": "USD", "changePct": 0.00 },`}</div>
                  <div>{`    "SAWAD": { "price": 21.70, "currency": "THB", "changePct": 0.00 }`}</div>
                  <div>{`  }`}</div>
                  <div>{`}`}</div>
                </div>
                <p>{quoteState.warnings.length ? `Warnings: ${quoteState.warnings.join(" | ")}` : "No API warnings."}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function StatusCard({ quoteState, isLive }: { quoteState: any; isLive: boolean }) {
  return (
    <Card className="mt-6 rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-800 p-2 text-slate-200">
            {isLive ? <Activity className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-semibold">{isLive ? "Live price mode" : "Snapshot fallback mode"}</div>
            <div className="mt-1 text-sm text-slate-400">
              Last updated: {quoteState.asOf} · FX USD/THB {quoteState.fx.toFixed(2)}
            </div>
            {quoteState.error && <div className="mt-1 text-xs text-amber-300">{quoteState.error}</div>}
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-full border-slate-700 px-3 py-1 text-slate-300">
          Refresh interval: {REFRESH_INTERVAL_MS / 1000}s
        </Badge>
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, note, icon }: { title: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-2xl bg-slate-800 p-2 text-slate-200">{icon}</div>
          <CircleDollarSign className="h-4 w-4 text-slate-600" />
        </div>
        <div className="text-sm text-slate-400">{title}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 text-xs text-slate-500">{note}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`rounded-3xl border-slate-800 bg-slate-900 shadow-sm ${className}`}>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">{subtitle}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function MiniCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="rounded-3xl border-slate-800 bg-slate-900 shadow-sm">
      <CardContent className="p-5">
        <div className="text-sm text-slate-400">{title}</div>
        <div className="mt-1 text-xl font-semibold">{value}</div>
        <div className="mt-2 text-sm text-slate-500">{note}</div>
      </CardContent>
    </Card>
  );
}
