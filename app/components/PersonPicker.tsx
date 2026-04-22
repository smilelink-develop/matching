"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type PersonOption = {
  id: number;
  name: string;
  nationality?: string | null;
  residenceStatus?: string | null;
  photoUrl?: string | null;
  englishName?: string | null;
};

/**
 * 検索付きの候補者ピッカー。
 * <select> の代わりに使えるコンボボックスで、名前・英語名・国籍・在留資格で絞り込みができる。
 */
export default function PersonPicker({
  persons,
  selectedId,
  onSelect,
  placeholder = "名前・英語名・国籍・在留資格で検索",
  className,
}: {
  persons: PersonOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = persons.find((p) => String(p.id) === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => {
      const hay = [p.name, p.englishName, p.nationality, p.residenceStatus]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [persons, query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const baseInput =
    "flex cursor-text items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/30";

  const displayValue = open
    ? query
    : selected
    ? [selected.name, selected.nationality, selected.residenceStatus].filter(Boolean).join(" / ")
    : query;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <div className={baseInput} onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none"
        />
        {selected && !open ? (
          <button
            type="button"
            aria-label="選択をクリア"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("");
              setQuery("");
            }}
            className="rounded-full px-1.5 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">
              {query ? `「${query}」に一致する候補者がいません` : "候補者がいません"}
            </p>
          ) : (
            filtered.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onSelect(String(person.id));
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-light)] ${
                  String(person.id) === selectedId ? "bg-[var(--color-light)]" : ""
                }`}
              >
                {person.photoUrl ? (
                  <Image
                    src={person.photoUrl}
                    alt={person.name}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-bold text-white">
                    {person.name[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text-dark)]">
                    {person.name}
                    {person.englishName ? <span className="ml-2 text-xs text-gray-400">{person.englishName}</span> : null}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[person.nationality, person.residenceStatus].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
