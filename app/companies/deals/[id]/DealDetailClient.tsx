"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SSW_INDUSTRIES } from "@/lib/company-options";

const CANDIDATE_COLUMNS = ["接続済み", "事前面談済み", "推薦済み", "内定済み"] as const;
const STATUS_OPTIONS = ["至急募集", "募集中", "面接中", "成約"] as const;
const PRIORITY_OPTIONS = [
  { value: "normal", label: "通常" },
  { value: "high", label: "高" },
  { value: "urgent", label: "急ぎ" },
] as const;

type CandidateCard = {
  id: number;
  note: string | null;
  stage: string;
  person: {
    id: number;
    name: string;
    nationality: string;
    residenceStatus: string;
    photoUrl: string | null;
    partner: { id: number; name: string } | null;
  };
};

type DealDetail = {
  id: number;
  title: string;
  field: string | null;
  company: { id: number; name: string };
  owner: { id: number; name: string } | null;
  priority: string;
  status: string;
  unitPrice: string | null;
  deadline: string | null;
  acceptedAt: string | null;
  requiredCount: number;
  recommendedCount: number;
  interviewCount: number;
  offerCount: number;
  contractCount: number;
  notes: string | null;
  candidates: CandidateCard[];
};

type PersonOption = {
  id: number;
  name: string;
  nationality: string;
  residenceStatus: string;
  photoUrl: string | null;
};

export default function DealDetailClient({
  deal,
  persons,
}: {
  deal: DealDetail;
  persons: PersonOption[];
}) {
  const router = useRouter();
  const [currentDeal, setCurrentDeal] = useState(deal);
  const [candidates, setCandidates] = useState(deal.candidates);
  const [draggingCandidateId, setDraggingCandidateId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: deal.title,
    field: deal.field ?? SSW_INDUSTRIES[0],
    priority: deal.priority,
    status: deal.status,
    unitPrice: deal.unitPrice ?? "",
    deadline: deal.deadline ? deal.deadline.slice(0, 10) : "",
    acceptedAt: deal.acceptedAt ? deal.acceptedAt.slice(0, 10) : "",
    notes: deal.notes ?? "",
  });

  const startEdit = () => {
    setEditForm({
      title: currentDeal.title,
      field: currentDeal.field ?? SSW_INDUSTRIES[0],
      priority: currentDeal.priority,
      status: currentDeal.status,
      unitPrice: currentDeal.unitPrice ?? "",
      deadline: currentDeal.deadline ? currentDeal.deadline.slice(0, 10) : "",
      acceptedAt: currentDeal.acceptedAt ? currentDeal.acceptedAt.slice(0, 10) : "",
      notes: currentDeal.notes ?? "",
    });
    setEditing(true);
  };

  const updateCounter = async (
    key: "requiredCount" | "recommendedCount" | "interviewCount" | "offerCount" | "contractCount",
    next: number,
  ) => {
    const clamped = Math.max(0, Math.floor(next));
    const previous = currentDeal[key];
    setCurrentDeal((prev) => ({ ...prev, [key]: clamped }));
    const response = await fetch(`/api/deals/${currentDeal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: clamped }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setCurrentDeal((prev) => ({ ...prev, [key]: previous }));
      alert(result.error || "カウンターの更新に失敗しました");
    }
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      alert("案件名を入力してください");
      return;
    }
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/deals/${currentDeal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "更新に失敗しました");
        return;
      }
      setCurrentDeal((prev) => ({
        ...prev,
        title: editForm.title,
        field: editForm.field || null,
        priority: editForm.priority,
        status: editForm.status,
        unitPrice: editForm.unitPrice || null,
        deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
        acceptedAt: editForm.acceptedAt ? new Date(editForm.acceptedAt).toISOString() : null,
        notes: editForm.notes || null,
      }));
      setEditing(false);
      router.refresh();
    } finally {
      setSavingEdit(false);
    }
  };

  const addablePersons = useMemo(
    () => persons.filter((person) => !candidates.some((candidate) => candidate.person.id === person.id)),
    [persons, candidates]
  );

  const moveCandidate = async (candidateId: number, nextStage: string) => {
    const currentCandidate = candidates.find((candidate) => candidate.id === candidateId);
    if (!currentCandidate || currentCandidate.stage === nextStage) return;

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, stage: nextStage } : candidate
      )
    );

    const response = await fetch(`/api/deal-candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      alert(result.error || "候補者ステップの更新に失敗しました");
      setCandidates(deal.candidates);
    }
  };

  const addCandidate = async () => {
    if (!selectedPersonId) {
      alert("候補者を選択してください");
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: Number(selectedPersonId) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "候補者の追加に失敗しました");
        return;
      }
      setCandidates((current) => [
        {
          id: result.candidate.id,
          note: result.candidate.note,
          stage: result.candidate.stage,
          person: result.candidate.person,
        },
        ...current,
      ]);
      setSelectedPersonId("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">案件情報</h2>
              <span className={statusClass(currentDeal.status)}>{currentDeal.status}</span>
              {currentDeal.priority && currentDeal.priority !== "normal" ? (
                <span className={priorityClass(currentDeal.priority)}>{priorityLabel(currentDeal.priority)}</span>
              ) : null}
            </div>
            {!editing ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <InfoRow label="企業" value={currentDeal.company.name} />
                <InfoRow label="担当者" value={currentDeal.owner?.name ?? "未設定"} />
                <InfoRow label="単価" value={formatUnitPrice(currentDeal.unitPrice)} />
                <InfoRow label="案件受付日" value={currentDeal.acceptedAt ? new Date(currentDeal.acceptedAt).toLocaleDateString("ja-JP") : "未設定"} />
                <InfoRow label="期限" value={currentDeal.deadline ? new Date(currentDeal.deadline).toLocaleDateString("ja-JP") : "未設定"} />
                <InfoRow label="分野" value={currentDeal.field ?? "未設定"} />
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Link href={`/companies/${currentDeal.company.id}`} className="self-start rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
              企業詳細へ戻る
            </Link>
            {!editing ? (
              <button
                type="button"
                onClick={startEdit}
                className="self-start rounded-lg border border-[var(--color-secondary)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
              >
                編集
              </button>
            ) : null}
          </div>
        </div>

        {!editing ? (
          currentDeal.notes ? (
            <p className="mt-5 rounded-xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4 text-sm leading-7 text-[var(--color-text-dark)]">
              {currentDeal.notes}
            </p>
          ) : null
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <EditField label="案件名 *" className="md:col-span-2">
              <input className={EDIT_INPUT} value={editForm.title} onChange={(e) => setEditForm((c) => ({ ...c, title: e.target.value }))} />
            </EditField>
            <EditField label="分野">
              <select className={EDIT_INPUT} value={editForm.field} onChange={(e) => setEditForm((c) => ({ ...c, field: e.target.value }))}>
                {SSW_INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </EditField>
            <EditField label="案件ステータス">
              <select className={EDIT_INPUT} value={editForm.status} onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </EditField>
            <EditField label="優先度">
              <select className={EDIT_INPUT} value={editForm.priority} onChange={(e) => setEditForm((c) => ({ ...c, priority: e.target.value }))}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </EditField>
            <EditField label="単価">
              <div className="relative">
                <input className={`${EDIT_INPUT} pr-12`} value={editForm.unitPrice} onChange={(e) => setEditForm((c) => ({ ...c, unitPrice: e.target.value }))} placeholder="45" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">万円</span>
              </div>
            </EditField>
            <EditField label="期限">
              <input className={EDIT_INPUT} type="date" value={editForm.deadline} onChange={(e) => setEditForm((c) => ({ ...c, deadline: e.target.value }))} />
            </EditField>
            <EditField label="案件受付日">
              <input className={EDIT_INPUT} type="date" value={editForm.acceptedAt} onChange={(e) => setEditForm((c) => ({ ...c, acceptedAt: e.target.value }))} />
            </EditField>
            <EditField label="メモ" className="md:col-span-2">
              <textarea className={`${EDIT_INPUT} min-h-24`} value={editForm.notes} onChange={(e) => setEditForm((c) => ({ ...c, notes: e.target.value }))} />
            </EditField>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {savingEdit ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">人数カウンター</h2>
          <p className="text-xs text-gray-500">上下矢印で即時更新されます</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CounterCell
            label="募集"
            value={currentDeal.requiredCount}
            onChange={(next) => void updateCounter("requiredCount", next)}
          />
          <CounterCell
            label="推薦"
            value={currentDeal.recommendedCount}
            onChange={(next) => void updateCounter("recommendedCount", next)}
          />
          <CounterCell
            label="面接"
            value={currentDeal.interviewCount}
            onChange={(next) => void updateCounter("interviewCount", next)}
          />
          <CounterCell
            label="内定"
            value={currentDeal.offerCount}
            onChange={(next) => void updateCounter("offerCount", next)}
          />
          <CounterCell
            label="成約"
            value={currentDeal.contractCount}
            onChange={(next) => void updateCounter("contractCount", next)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">候補者を追加</label>
            <select
              className={INPUT}
              value={selectedPersonId}
              onChange={(event) => setSelectedPersonId(event.target.value)}
            >
              <option value="">候補者を選択</option>
              {addablePersons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} / {person.nationality} / {person.residenceStatus}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void addCandidate()}
            disabled={adding}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {adding ? "追加中..." : "候補者を追加"}
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-4">
        {CANDIDATE_COLUMNS.map((column) => {
          const columnCandidates = candidates.filter((candidate) => candidate.stage === column);
          return (
            <section
              key={column}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingCandidateId) {
                  void moveCandidate(draggingCandidateId, column);
                  setDraggingCandidateId(null);
                }
              }}
              className="flex max-h-[calc(100vh-16rem)] flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">{column}</h3>
                <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                  {columnCandidates.length}名
                </span>
              </div>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {columnCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    draggable
                    onDragStart={() => setDraggingCandidateId(candidate.id)}
                    onDragEnd={() => setDraggingCandidateId(null)}
                    className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      {candidate.person.photoUrl ? (
                        <Image
                          src={candidate.person.photoUrl}
                          alt={candidate.person.name}
                          width={44}
                          height={44}
                          unoptimized
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">
                          {candidate.person.name[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text-dark)]">{candidate.person.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {candidate.person.nationality} / {candidate.person.residenceStatus}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          紹介パートナー: {candidate.person.partner?.name ?? "未設定"}
                        </p>
                      </div>
                    </div>
                    {candidate.note ? (
                      <p className="mt-3 text-sm leading-6 text-gray-600">{candidate.note}</p>
                    ) : null}
                  </div>
                ))}
                {columnCandidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                    候補者なし
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--color-light)] px-3 py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-[var(--color-text-dark)] text-right">{value}</span>
    </div>
  );
}

function EditField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
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
  if (priority === "urgent")
    return "rounded-full bg-[#DC2626] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm";
  if (priority === "high")
    return "rounded-full bg-[#F59E0B] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm";
  return "rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]";
}

function statusClass(status: string) {
  if (status === "至急募集") return "rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-medium text-[#B91C1C]";
  if (status === "募集中") return "rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-medium text-[#92400E]";
  if (status === "面接中") return "rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8]";
  return "rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-medium text-[#166534]";
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30";

const EDIT_INPUT = INPUT;

function formatUnitPrice(value: string | null) {
  if (!value) return "未設定";
  return value.includes("万円") ? value : `${value}万円`;
}

function CounterCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <p className="text-sm font-semibold text-[var(--color-text-dark)]">{label}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`${label} を減らす`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-[var(--color-primary)]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span className="min-w-[1.5rem] text-center text-xs tabular-nums text-gray-500">{value}</span>
        <button
          type="button"
          aria-label={`${label} を増やす`}
          onClick={() => onChange(value + 1)}
          className="flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-[var(--color-primary)]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
