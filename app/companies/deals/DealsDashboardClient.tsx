"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_COLUMNS = ["至急募集", "募集中", "面接中", "成約"] as const;

type Deal = {
  id: number;
  title: string;
  companyName: string;
  partnerName: string | null;
  ownerName: string;
  priority: string;
  status: string;
  unitPrice: string | null;
  deadline: string | null;
  notes: string | null;
  candidatesCount: number;
};

export default function DealsDashboardClient({ deals: initialDeals }: { deals: Deal[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [draggingDealId, setDraggingDealId] = useState<number | null>(null);

  const summary = useMemo(() => {
    const activeCount = deals.filter((deal) => deal.status !== "成約").length;
    const urgentCount = deals.filter((deal) => deal.status === "至急募集").length;
    const candidateCount = deals.reduce((sum, deal) => sum + deal.candidatesCount, 0);
    return { activeCount, urgentCount, candidateCount };
  }, [deals]);

  const moveDeal = async (dealId: number, nextStatus: string) => {
    const currentDeal = deals.find((deal) => deal.id === dealId);
    if (!currentDeal || currentDeal.status === nextStatus) return;

    setDeals((current) =>
      current.map((deal) => (deal.id === dealId ? { ...deal, status: nextStatus } : deal))
    );

    const response = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      alert(result.error || "案件ステータスの更新に失敗しました");
      setDeals(initialDeals);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="アクティブ案件" value={`${summary.activeCount}件`} />
        <SummaryCard label="至急案件" value={`${summary.urgentCount}件`} tone="alert" />
        <SummaryCard label="紐づき候補者" value={`${summary.candidateCount}名`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-4">
        {STATUS_COLUMNS.map((column) => {
          const columnDeals = deals.filter((deal) => deal.status === column);
          return (
            <section
              key={column}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingDealId) {
                  void moveDeal(draggingDealId, column);
                  setDraggingDealId(null);
                }
              }}
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--color-text-dark)]">{column}</h2>
                <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                  {columnDeals.length}件
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {columnDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/companies/deals/${deal.id}`}
                    draggable
                    onDragStart={() => setDraggingDealId(deal.id)}
                    onDragEnd={() => setDraggingDealId(null)}
                    className="block rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4 transition hover:border-[var(--color-secondary)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-dark)]">{deal.title}</p>
                        <p className="mt-1 text-xs text-gray-500">{deal.companyName}</p>
                      </div>
                      <span className={priorityClass(deal.priority)}>{priorityLabel(deal.priority)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <Pill>{deal.ownerName}</Pill>
                      <Pill>{deal.unitPrice ?? "単価未設定"}</Pill>
                      <Pill>{deal.candidatesCount}名</Pill>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      {deal.deadline ? `期限 ${new Date(deal.deadline).toLocaleDateString("ja-JP")}` : "期限未設定"}
                    </p>
                  </Link>
                ))}
                {columnDeals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                    案件なし
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "alert" }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone === "alert" ? "border-[#FED7AA] bg-[#FFF7ED]" : "border-gray-200 bg-white"}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--color-text-dark)]">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-2.5 py-1">{children}</span>;
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "urgent":
      return "急ぎ";
    case "high":
      return "高";
    default:
      return "通常";
  }
}

function priorityClass(priority: string) {
  if (priority === "urgent") return "rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-medium text-[#B91C1C]";
  if (priority === "high") return "rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#92400E]";
  return "rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)]";
}
