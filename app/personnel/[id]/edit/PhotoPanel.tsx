"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export default function PhotoPanel({
  personId,
  personName,
  initialPhotoUrl,
  iconActions,
}: {
  personId: number;
  personName: string;
  initialPhotoUrl: string | null;
  iconActions?: ReactNode;
}) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("画像は 3MB 以下にしてください");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const response = await fetch(`/api/personnel/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: dataUrl }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "写真の保存に失敗しました");
        return;
      }
      setPhotoUrl(result.person?.photoUrl ?? dataUrl);
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!photoUrl) return;
    if (!confirm("顔写真を削除しますか?")) return;
    const response = await fetch(`/api/personnel/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: null }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      alert(result.error || "削除に失敗しました");
      return;
    }
    setPhotoUrl(null);
    router.refresh();
  };

  return (
    <section className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={personName}
          width={80}
          height={80}
          unoptimized
          className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-[var(--color-light)] text-[var(--color-primary)] shadow-sm">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-semibold text-[var(--color-text-dark)]">{personName}</p>
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]">
          {uploading ? "読み込み中..." : "写真をアップロード"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
          />
        </label>
        {photoUrl ? (
          <button
            type="button"
            onClick={() => void removePhoto()}
            className="block text-[11px] text-gray-500 hover:underline"
          >
            写真を削除
          </button>
        ) : null}
      </div>
      {iconActions ? (
        <div className="ml-auto flex shrink-0 items-center gap-3">{iconActions}</div>
      ) : null}
    </section>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
