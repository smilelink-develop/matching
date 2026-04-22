"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PLACEMENT_STAGES, type PlacementStageId } from "@/lib/placement-stage";

export type PlacementCardData = {
  id: number;
  personId: number;
  personName: string;
  photoUrl: string | null;
  nationality: string;
  residenceStatus: string;
  stage: PlacementStageId;
  offerAt: string | null;
  offerAcceptedAt: string | null;
  applicationAt: string | null;
  applicationResultAt: string | null;
  entryAt: string | null;
  joinAt: string | null;
};

export default function PlacementsBoard({ initialCards }: { initialCards: PlacementCardData[] }) {
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const move = async (personId: number, nextStage: PlacementStageId) => {
    const previous = cards;
    setCards((current) =>
      current.map((card) => (card.personId === personId ? { ...card, stage: nextStage } : card))
    );
    const response = await fetch(`/api/personnel/${personId}/placement`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setCards(previous);
      alert(result.error || "ステージの更新に失敗しました");
    }
  };

  const summary = useMemo(() => {
    const counts: Record<PlacementStageId, number> = {
      offered: 0,
      accepted: 0,
      applying: 0,
      approved: 0,
      entered: 0,
      joined: 0,
    };
    for (const card of cards) {
      counts[card.stage]++;
    }
    return counts;
  }, [cards]);

  return (
    <div className="grid gap-5 xl:grid-cols-6">
      {PLACEMENT_STAGES.map((stage) => {
        const columnCards = cards.filter((card) => card.stage === stage.id);
        return (
          <section
            key={stage.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId !== null) {
                void move(draggingId, stage.id);
                setDraggingId(null);
              }
            }}
            className="flex max-h-[calc(100vh-12rem)] flex-col rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-dark)]">{stage.label}</h2>
              <span className="rounded-full bg-[var(--color-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                {summary[stage.id]}名
              </span>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {columnCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/personnel/${card.personId}/edit`}
                  draggable
                  onDragStart={() => setDraggingId(card.personId)}
                  onDragEnd={() => setDraggingId(null)}
                  className="block cursor-grab rounded-2xl border border-gray-200 bg-[var(--color-light)] p-3 transition hover:border-[var(--color-secondary)] hover:bg-white active:cursor-grabbing"
                >
                  <div className="flex items-start gap-3">
                    {card.photoUrl ? (
                      <Image
                        src={card.photoUrl}
                        alt={card.personName}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">
                        {card.personName[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-text-dark)]">
                        {card.personName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {card.nationality} / {card.residenceStatus}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-500">
                    {card.offerAt ? <Pill>内 {formatDate(card.offerAt)}</Pill> : null}
                    {card.offerAcceptedAt ? <Pill>承 {formatDate(card.offerAcceptedAt)}</Pill> : null}
                    {card.applicationAt ? <Pill>申 {formatDate(card.applicationAt)}</Pill> : null}
                    {card.applicationResultAt ? <Pill>結 {formatDate(card.applicationResultAt)}</Pill> : null}
                    {card.entryAt ? <Pill>国 {formatDate(card.entryAt)}</Pill> : null}
                    {card.joinAt ? <Pill>社 {formatDate(card.joinAt)}</Pill> : null}
                  </div>
                </Link>
              ))}
              {columnCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-3 py-8 text-center text-xs text-gray-400">
                  候補者なし
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-1.5 py-0.5">{children}</span>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
