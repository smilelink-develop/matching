"use client";

import { useMemo, useState } from "react";

type DealRow = {
  id: number;
  title: string;
  companyName: string;
  acceptedAt: string | null;
  createdAt: string;
  requiredCount: number;
  recommendedCount: number;
  interviewCount: number;
  offerCount: number;
  contractCount: number;
};

type InvoiceRow = {
  id: number;
  invoiceDate: string | null;
  createdAt: string;
  invoiceAmount: string | null;
  costAmount: string | null;
  channel: string;
  invoiceStatus: string;
  dealTitle: string | null;
  companyName: string | null;
  personName: string | null;
};

type Preset = "30d" | "90d" | "thisYear" | "custom";

function parseNumber(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

function toLocalDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function RevenueDashboard({
  initialDeals,
  initialInvoices,
}: {
  initialDeals: DealRow[];
  initialInvoices: InvoiceRow[];
}) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState(toLocalDateInput(thirtyDaysAgo));
  const [to, setTo] = useState(toLocalDateInput(today));

  const applyPreset = (value: Preset) => {
    setPreset(value);
    const now = new Date();
    if (value === "30d") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      setFrom(toLocalDateInput(start));
      setTo(toLocalDateInput(now));
    } else if (value === "90d") {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      setFrom(toLocalDateInput(start));
      setTo(toLocalDateInput(now));
    } else if (value === "thisYear") {
      const start = new Date(now.getFullYear(), 0, 1);
      setFrom(toLocalDateInput(start));
      setTo(toLocalDateInput(now));
    }
  };

  const fromDate = useMemo(() => new Date(`${from}T00:00:00`), [from]);
  const toDate = useMemo(() => {
    const d = new Date(`${to}T23:59:59`);
    return d;
  }, [to]);

  const dealsInRange = useMemo(
    () =>
      initialDeals.filter((deal) => {
        const ref = deal.acceptedAt ? new Date(deal.acceptedAt) : new Date(deal.createdAt);
        return ref >= fromDate && ref <= toDate;
      }),
    [initialDeals, fromDate, toDate]
  );

  const invoicesInRange = useMemo(
    () =>
      initialInvoices.filter((invoice) => {
        const ref = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(invoice.createdAt);
        return ref >= fromDate && ref <= toDate;
      }),
    [initialInvoices, fromDate, toDate]
  );

  const kpi = useMemo(() => {
    const totals = dealsInRange.reduce(
      (acc, deal) => ({
        required: acc.required + deal.requiredCount,
        recommended: acc.recommended + deal.recommendedCount,
        interview: acc.interview + deal.interviewCount,
        offer: acc.offer + deal.offerCount,
        contract: acc.contract + deal.contractCount,
      }),
      { required: 0, recommended: 0, interview: 0, offer: 0, contract: 0 }
    );
    const revenue = invoicesInRange.reduce((sum, invoice) => sum + parseNumber(invoice.invoiceAmount), 0);
    const cost = invoicesInRange.reduce((sum, invoice) => sum + parseNumber(invoice.costAmount), 0);
    const paid = invoicesInRange
      .filter((invoice) => invoice.invoiceStatus === "入金済み")
      .reduce((sum, invoice) => sum + parseNumber(invoice.invoiceAmount), 0);
    const recommendToOffer = totals.recommended > 0 ? (totals.offer / totals.recommended) * 100 : 0;
    const interviewToOffer = totals.interview > 0 ? (totals.offer / totals.interview) * 100 : 0;
    return {
      ...totals,
      revenue,
      cost,
      paid,
      gross: revenue - cost,
      recommendToOffer,
      interviewToOffer,
      dealCount: dealsInRange.length,
    };
  }, [dealsInRange, invoicesInRange]);

  const monthly = useMemo(() => {
    const map = new Map<string, { revenue: number; offer: number; contract: number }>();
    for (const invoice of invoicesInRange) {
      const key = monthKey(invoice.invoiceDate ?? invoice.createdAt);
      const cur = map.get(key) ?? { revenue: 0, offer: 0, contract: 0 };
      cur.revenue += parseNumber(invoice.invoiceAmount);
      map.set(key, cur);
    }
    for (const deal of dealsInRange) {
      const key = monthKey(deal.acceptedAt ?? deal.createdAt);
      const cur = map.get(key) ?? { revenue: 0, offer: 0, contract: 0 };
      cur.offer += deal.offerCount;
      cur.contract += deal.contractCount;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, value]) => ({ month: key, ...value }));
  }, [dealsInRange, invoicesInRange]);

  const funnel = [
    { label: "募集", value: kpi.required, color: "#E0E7FF" },
    { label: "推薦", value: kpi.recommended, color: "#C7D2FE" },
    { label: "面接", value: kpi.interview, color: "#A5B4FC" },
    { label: "内定", value: kpi.offer, color: "#818CF8" },
    { label: "成約", value: kpi.contract, color: "#6366F1" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">売上ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">期間を指定して、案件ファネル・売上・ボトルネックを分析できます。</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            {(["30d", "90d", "thisYear", "custom"] as Preset[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => applyPreset(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  preset === value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {value === "30d" ? "過去30日" : value === "90d" ? "過去90日" : value === "thisYear" ? "今年" : "カスタム"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>開始</span>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>終了</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset("custom"); }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="案件数" value={`${kpi.dealCount}件`} hint="期間内に受付された案件" />
        <KpiCard label="成約数" value={`${kpi.contract}名`} hint="案件内カウンター合計" />
        <KpiCard label="請求売上" value={`${kpi.revenue.toLocaleString()}円`} hint={`入金済み ${kpi.paid.toLocaleString()} 円`} />
        <KpiCard label="粗利" value={`${kpi.gross.toLocaleString()}円`} hint={`仕入高 ${kpi.cost.toLocaleString()} 円`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-dark)]">案件ファネル</h2>
            <p className="text-xs text-gray-500">募集 → 推薦 → 面接 → 内定 → 成約</p>
          </div>
          <div className="mt-4 space-y-3">
            {funnel.map((stage) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{stage.label}</span>
                  <span>{stage.value}名</span>
                </div>
                <div className="mt-1 h-5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(stage.value / funnelMax) * 100}%`, background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-[var(--color-light)] px-3 py-2">
              <p className="text-gray-500">推薦 → 内定 転換率</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text-dark)]">{kpi.recommendToOffer.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-[var(--color-light)] px-3 py-2">
              <p className="text-gray-500">面接 → 内定 転換率</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-text-dark)]">{kpi.interviewToOffer.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-dark)]">月別 売上 / 内定 / 成約</h2>
            <p className="text-xs text-gray-500">縦軸の目盛は自動スケール</p>
          </div>
          <MonthlyChart data={monthly} />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">期間内の請求一覧</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[var(--color-light)] text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2">請求日</th>
                <th className="px-3 py-2">候補者</th>
                <th className="px-3 py-2">企業 / 案件</th>
                <th className="px-3 py-2">区分</th>
                <th className="px-3 py-2 text-right">請求額</th>
                <th className="px-3 py-2 text-right">仕入高</th>
                <th className="px-3 py-2">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {invoicesInRange.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("ja-JP") : "-"}
                  </td>
                  <td className="px-3 py-2">{invoice.personName ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {invoice.companyName ? `${invoice.companyName} / ${invoice.dealTitle ?? "-"}` : invoice.dealTitle ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">{invoice.channel}</td>
                  <td className="px-3 py-2 text-right">{parseNumber(invoice.invoiceAmount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{parseNumber(invoice.costAmount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{invoice.invoiceStatus}</td>
                </tr>
              ))}
              {invoicesInRange.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-400">期間内の請求はありません</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--color-text-dark)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function MonthlyChart({
  data,
}: {
  data: { month: string; revenue: number; offer: number; contract: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
        期間内のデータがありません
      </p>
    );
  }

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const maxCount = Math.max(1, ...data.map((d) => Math.max(d.offer, d.contract)));
  const width = Math.max(360, data.length * 72);
  const height = 240;
  const padding = { top: 16, right: 24, bottom: 40, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const barWidth = innerWidth / data.length * 0.45;

  const revenuePoints = data
    .map((d, i) => {
      const x = padding.left + (innerWidth / data.length) * (i + 0.5);
      const y = padding.top + innerHeight - (d.revenue / maxRevenue) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-4 overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="#E5E7EB"
        />
        {data.map((d, i) => {
          const centerX = padding.left + (innerWidth / data.length) * (i + 0.5);
          const barOfferH = (d.offer / maxCount) * innerHeight;
          const barContractH = (d.contract / maxCount) * innerHeight;
          return (
            <g key={d.month}>
              <rect
                x={centerX - barWidth}
                y={padding.top + innerHeight - barOfferH}
                width={barWidth * 0.8}
                height={barOfferH}
                fill="#818CF8"
                rx={4}
              />
              <rect
                x={centerX + barWidth * 0.05}
                y={padding.top + innerHeight - barContractH}
                width={barWidth * 0.8}
                height={barContractH}
                fill="#6366F1"
                rx={4}
              />
              <text
                x={centerX}
                y={padding.top + innerHeight + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6B7280"
              >
                {d.month.slice(2)}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="#22C55E"
          strokeWidth={2}
          points={revenuePoints}
        />
        {data.map((d, i) => {
          const x = padding.left + (innerWidth / data.length) * (i + 0.5);
          const y = padding.top + innerHeight - (d.revenue / maxRevenue) * innerHeight;
          return <circle key={`dot-${d.month}`} cx={x} cy={y} r={3} fill="#22C55E" />;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <LegendDot color="#818CF8" label="内定数" />
        <LegendDot color="#6366F1" label="成約数" />
        <LegendDot color="#22C55E" label="請求売上（折れ線）" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
