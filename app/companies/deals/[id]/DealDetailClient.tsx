"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const CANDIDATE_COLUMNS = ["接続済み", "事前面談済み", "推薦済み", "内定済み"] as const;

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
  };
};

type DealDetail = {
  id: number;
  title: string;
  company: { id: number; name: string };
  partner: { id: number; name: string } | null;
  owner: { id: number; name: string } | null;
  priority: string;
  status: string;
  unitPrice: string | null;
  deadline: string | null;
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
  const [candidates, setCandidates] = useState(deal.candidates);
  const [draggingCandidateId, setDraggingCandidateId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [adding, setAdding] = useState(false);

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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InfoCard label="企業" value={deal.company.name} />
        <InfoCard label="担当者" value={deal.owner?.name ?? "未設定"} />
        <InfoCard label="パートナー" value={deal.partner?.name ?? "未設定"} />
        <InfoCard label="単価" value={deal.unitPrice ?? "未設定"} />
        <InfoCard label="期限" value={deal.deadline ? new Date(deal.deadline).toLocaleDateString("ja-JP") : "未設定"} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-dark)]">案件情報</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <Pill>{deal.status}</Pill>
              <Pill>{priorityLabel(deal.priority)}</Pill>
            </div>
          </div>
          <Link href={`/companies/${deal.company.id}`} className="text-xs text-[var(--color-primary)] hover:underline">
            企業詳細へ戻る
          </Link>
        </div>
        {deal.notes ? (
          <p className="mt-4 rounded-xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4 text-sm leading-7 text-[var(--color-text-dark)]">
            {deal.notes}
          </p>
        ) : null}
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
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">{column}</h3>
                <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                  {columnCandidates.length}名
                </span>
              </div>
              <div className="mt-4 space-y-3">
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-text-dark)]">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1">{children}</span>;
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

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30";
