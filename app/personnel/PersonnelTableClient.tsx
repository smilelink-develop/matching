"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DEFAULT_PERSONNEL_COLUMNS,
  MAX_PERSONNEL_COLUMNS,
  PERSONNEL_COLUMN_SECTIONS,
  type PersonnelColumnKey,
} from "@/lib/personnel-columns";
import { calculateAge } from "@/lib/candidate-profile";

type PersonRow = {
  id: number;
  name: string;
  photoUrl: string | null;
  driveFolderUrl: string | null;
  nationality: string;
  residenceStatus: string;
  channel: string;
  partnerName: string | null;
  englishName: string | null;
  phoneNumber: string | null;
  gender: string | null;
  birthDate: string | null;
  postalCode: string | null;
  address: string | null;
  spouseStatus: string | null;
  childrenCount: string | null;
  motivation: string | null;
  selfIntroduction: string | null;
  japanPurpose: string | null;
  currentJob: string | null;
  retirementReason: string | null;
  preferenceNote: string | null;
  visaExpiryDate: string | null;
  japaneseLevel: string | null;
  japaneseLevelDate: string | null;
  licenseName: string | null;
  licenseExpiryDate: string | null;
  otherQualificationName: string | null;
  otherQualificationExpiryDate: string | null;
  traineeExperience: string | null;
  highSchoolName: string | null;
  highSchoolStartDate: string | null;
  highSchoolEndDate: string | null;
  universityName: string | null;
  universityStartDate: string | null;
  universityEndDate: string | null;
};

const CHANNEL_LABEL: Record<string, string> = {
  LINE: "LINE",
  Messenger: "Messenger",
  mail: "メール",
  WhatsApp: "WhatsApp",
};

export default function PersonnelTableClient({ persons }: { persons: PersonRow[] }) {
  const [selectedColumns, setSelectedColumns] = useState<PersonnelColumnKey[]>(DEFAULT_PERSONNEL_COLUMNS);
  const [draftColumns, setDraftColumns] = useState<PersonnelColumnKey[]>(DEFAULT_PERSONNEL_COLUMNS);
  const [editingColumns, setEditingColumns] = useState(false);

  const orderedItems = useMemo(
    () => PERSONNEL_COLUMN_SECTIONS.flatMap((section) => section.items),
    []
  );

  const sortByEditOrder = (keys: PersonnelColumnKey[]) => {
    const orderIndex = new Map(orderedItems.map((item, index) => [item.key, index]));
    return [...keys].sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
    );
  };

  const appliedColumns = useMemo(
    () =>
      sortByEditOrder(selectedColumns).map((key) => ({
        key,
        label: orderedItems.find((item) => item.key === key)?.label ?? key,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedColumns, orderedItems]
  );

  const toggleDraftColumn = (key: PersonnelColumnKey) => {
    setDraftColumns((current) => {
      if (current.includes(key)) return current.filter((column) => column !== key);
      if (current.length >= MAX_PERSONNEL_COLUMNS) return current;
      return [...current, key];
    });
  };

  const applyColumns = () => {
    setSelectedColumns(sortByEditOrder(draftColumns));
    setEditingColumns(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setDraftColumns(selectedColumns);
            setEditingColumns((current) => !current);
          }}
          className="rounded-lg border border-[var(--color-secondary)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)]"
        >
          表示項目を編集
        </button>
        <p className="text-xs text-gray-500">最大 {MAX_PERSONNEL_COLUMNS} 項目まで表示できます</p>
      </div>

      {editingColumns ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            {PERSONNEL_COLUMN_SECTIONS.map((section) => (
              <div key={section.id} className="rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">{section.label}</p>
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => {
                    const checked = draftColumns.includes(item.key);
                    const disabled = !checked && draftColumns.length >= MAX_PERSONNEL_COLUMNS;
                    return (
                      <label key={item.key} className={`flex items-center gap-3 text-sm ${disabled ? "text-gray-300" : "text-[var(--color-text-dark)]"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleDraftColumn(item.key)}
                          className="accent-[var(--color-primary)]"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingColumns(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={applyColumns}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              反映
            </button>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-light)] text-[var(--color-text-dark)]">
              {appliedColumns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left font-semibold">
                  {column.label}
                </th>
              ))}
              <th className="w-16 px-4 py-3 text-center font-semibold">資料</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr key={person.id} className="border-t border-gray-100 hover:bg-gray-50">
                {appliedColumns.map((column, index) => (
                  <td key={column.key} className="px-4 py-3 text-gray-600">
                    <Link href={`/personnel/${person.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">
                      {renderColumn(person, column.key, index === 0)}
                    </Link>
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                  {person.driveFolderUrl ? (
                    <a
                      href={person.driveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-secondary)] bg-[var(--color-light)] text-[var(--color-primary)] hover:bg-white"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <FolderIcon />
                    </a>
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-300">
                      <FolderIcon />
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {persons.length === 0 ? (
              <tr>
                <td colSpan={appliedColumns.length + 1} className="px-4 py-10 text-center text-gray-400">
                  候補者が登録されていません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderColumn(person: PersonRow, key: PersonnelColumnKey, isFirst: boolean) {
  if (key === "name") {
    return (
      <div className="flex items-center gap-3">
        {person.photoUrl ? (
          <Image
            src={person.photoUrl}
            alt={person.name}
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">
            {person.name[0]}
          </div>
        )}
        <span className={isFirst ? "font-medium text-[var(--color-text-dark)]" : ""}>{person.name}</span>
      </div>
    );
  }

  const text = getColumnText(person, key);
  if (key === "channel") {
    return (
      <span className="inline-block rounded-full bg-[var(--color-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
        {text}
      </span>
    );
  }
  return text;
}

function getColumnText(person: PersonRow, key: PersonnelColumnKey) {
  switch (key) {
    case "englishName":
      return person.englishName ?? "-";
    case "nationality":
      return person.nationality;
    case "channel":
      return CHANNEL_LABEL[person.channel] ?? person.channel;
    case "residenceStatus":
      return person.residenceStatus;
    case "partner":
      return person.partnerName ?? "未設定";
    case "phoneNumber":
      return person.phoneNumber ?? "-";
    case "gender":
      return person.gender ?? "-";
    case "birthDate":
      return person.birthDate ?? "-";
    case "age":
      return calculateAge(person.birthDate) || "-";
    case "postalCode":
      return person.postalCode ?? "-";
    case "address":
      return person.address ?? "-";
    case "spouseStatus":
      return person.spouseStatus ?? "-";
    case "childrenCount":
      return person.childrenCount ?? "-";
    case "motivation":
      return person.motivation ?? "-";
    case "selfIntroduction":
      return person.selfIntroduction ?? "-";
    case "japanPurpose":
      return person.japanPurpose ?? "-";
    case "currentJob":
      return person.currentJob ?? "-";
    case "retirementReason":
      return person.retirementReason ?? "-";
    case "preferenceNote":
      return person.preferenceNote ?? "-";
    case "visaExpiryDate":
      return person.visaExpiryDate ?? "-";
    case "japaneseLevel":
      return person.japaneseLevel ?? "-";
    case "japaneseLevelDate":
      return person.japaneseLevelDate ?? "-";
    case "licenseName":
      return person.licenseName ?? "-";
    case "licenseExpiryDate":
      return person.licenseExpiryDate ?? "-";
    case "otherQualificationName":
      return person.otherQualificationName ?? "-";
    case "otherQualificationExpiryDate":
      return person.otherQualificationExpiryDate ?? "-";
    case "traineeExperience":
      return person.traineeExperience ?? "-";
    case "highSchoolName":
      return person.highSchoolName ?? "-";
    case "highSchoolPeriod":
      return [person.highSchoolStartDate, person.highSchoolEndDate].filter(Boolean).join(" 〜 ") || "-";
    case "universityName":
      return person.universityName ?? "-";
    case "universityPeriod":
      return [person.universityStartDate, person.universityEndDate].filter(Boolean).join(" 〜 ") || "-";
    default:
      return person.name;
  }
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l1.4 1.8c.2.25.5.4.82.4H18.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
