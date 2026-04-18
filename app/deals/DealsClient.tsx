"use client";

import { useMemo, useState } from "react";

type Deal = {
  id: number;
  title: string;
  companyName: string;
  partnerName: string | null;
  ownerName: string;
  priority: string;
  status: string;
  notes: string | null;
  updatedAt: string;
  candidates: {
    id: number;
    personName: string;
    nationality: string;
    stage: string;
    note: string | null;
  }[];
};

export default function DealsClient({ deals }: { deals: Deal[] }) {
  const [openDealId, setOpenDealId] = useState<number | null>(deals[0]?.id ?? null);

  const summary = useMemo(() => {
    const active = deals.filter((deal) => deal.status === "active").length;
    const urgent = deals.filter((deal) => deal.priority === "urgent").length;
    const candidates = deals.reduce((sum, deal) => sum + deal.candidates.length, 0);
    return { active, urgent, candidates };
  }, [deals]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="アクティブ案件" value={`${summary.active}件`} tone="primary" />
        <SummaryCard label="急ぎ案件" value={`${summary.urgent}件`} tone="alert" />
        <SummaryCard label="進行中候補者" value={`${summary.candidates}名`} tone="neutral" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          {deals.map((deal) => {
            const isOpen = openDealId === deal.id;
            return (
              <button
                key={deal.id}
                type="button"
                onClick={() => setOpenDealId(deal.id)}
                className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${
                  isOpen
                    ? "border-[var(--color-primary)] bg-white ring-2 ring-[var(--color-primary)]/10"
                    : "border-gray-200 bg-white hover:border-[var(--color-secondary)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-dark)]">{deal.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{deal.companyName}</p>
                  </div>
                  <span className={priorityClass(deal.priority)}>{priorityLabel(deal.priority)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                  <InfoPill>{deal.ownerName}</InfoPill>
                  <InfoPill>{deal.partnerName || "パートナー未設定"}</InfoPill>
                  <InfoPill>{deal.candidates.length}名</InfoPill>
                </div>
                <p className="mt-4 text-xs text-gray-400">
                  更新日: {new Date(deal.updatedAt).toLocaleDateString("ja-JP")}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {deals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
              まだ案件がありません
            </p>
          ) : (
            deals
              .filter((deal) => deal.id === openDealId)
              .map((deal) => (
                <div key={deal.id} className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-primary)]">
                        DEAL DETAIL
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-dark)]">
                        {deal.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        {deal.companyName}
                        {deal.partnerName ? ` / ${deal.partnerName}` : ""}
                      </p>
                    </div>
                    <span className={statusClass(deal.status)}>{statusLabel(deal.status)}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <DetailCard label="担当者" value={deal.ownerName} />
                    <DetailCard label="優先度" value={priorityLabel(deal.priority)} />
                    <DetailCard label="候補者" value={`${deal.candidates.length}名`} />
                  </div>

                  {deal.notes ? (
                    <div className="rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-4">
                      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--color-primary)]">
                        NOTES
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-text-dark)]">{deal.notes}</p>
                    </div>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-[var(--color-text-dark)]">候補者の状況</h3>
                      <span className="text-xs text-gray-500">クリック時だけ詳細表示</span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {deal.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text-dark)]">{candidate.personName}</p>
                              <p className="mt-1 text-xs text-gray-500">{candidate.nationality}</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)] border border-[var(--color-secondary)]">
                              {candidate.stage}
                            </span>
                          </div>
                          {candidate.note ? (
                            <p className="mt-3 text-sm leading-6 text-gray-600">{candidate.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "alert" | "neutral";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--color-light)] border-[var(--color-secondary)]"
      : tone === "alert"
        ? "bg-[#FFF7ED] border-[#FED7AA]"
        : "bg-white border-gray-200";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--color-text-dark)]">{value}</p>
    </div>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1">{children}</span>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-text-dark)]">{value}</p>
    </div>
  );
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
  if (priority === "urgent") {
    return "rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-medium text-[#B91C1C]";
  }
  if (priority === "high") {
    return "rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-medium text-[#92400E]";
  }
  return "rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)]";
}

function statusLabel(status: string) {
  switch (status) {
    case "paused":
      return "保留";
    case "closed":
      return "完了";
    default:
      return "進行中";
  }
}

function statusClass(status: string) {
  if (status === "closed") {
    return "rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-medium text-[#166534]";
  }
  if (status === "paused") {
    return "rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-medium text-[#92400E]";
  }
  return "rounded-full bg-[var(--color-light)] px-3 py-1 text-xs font-medium text-[var(--color-primary-hover)]";
}
