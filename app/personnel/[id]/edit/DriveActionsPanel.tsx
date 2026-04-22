"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DriveActionsPanel({
  personId,
  initialDriveFolderUrl,
}: {
  personId: number;
  initialDriveFolderUrl: string | null;
}) {
  const router = useRouter();
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(initialDriveFolderUrl);

  const editUrl = async () => {
    const input = prompt(
      "保管場所 (Google Drive) の URL",
      driveFolderUrl ?? "https://drive.google.com/drive/folders/"
    );
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) return;
    const response = await fetch(`/api/personnel/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFolderUrl: trimmed }),
    });
    const result = await response.json();
    if (!result.ok) {
      alert(result.error || "更新に失敗しました");
      return;
    }
    setDriveFolderUrl(trimmed);
    router.refresh();
  };

  return (
    <>
      {driveFolderUrl ? (
        <a
          href={driveFolderUrl}
          target="_blank"
          rel="noreferrer"
          title="保管場所を開く"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-secondary)] bg-white text-[var(--color-primary)] shadow-sm transition-transform hover:scale-110 hover:bg-[var(--color-light)]"
        >
          <FolderIcon />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void editUrl()}
          title="保管場所 未設定 (クリックで設定)"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-gray-400 transition-transform hover:scale-110 hover:text-[var(--color-primary)]"
        >
          <FolderIcon />
        </button>
      )}

      <button
        type="button"
        onClick={() => void editUrl()}
        title="保管場所 URL を編集"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-secondary)] bg-white text-[var(--color-primary)] shadow-sm transition-transform hover:scale-110 hover:bg-[var(--color-light)]"
      >
        <EditIcon />
      </button>
    </>
  );
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l1.4 1.8c.2.25.5.4.82.4H18.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
