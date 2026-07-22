"use client";

import { useState } from "react";

type SyncResponse = {
  ok: boolean;
  error?: string;
  result?: {
    updated: number;
    appended: number;
    unchanged: number;
    skippedUnchanged: number;
  };
};

/**
 * 変更があった候補者だけを今すぐスプシに反映するボタン。
 * 通常は毎正時の自動同期に任せるが、すぐ反映したいときに使う。
 */
export default function SyncSheetNowButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const run = async () => {
    setRunning(true);
    setMessage(null);
    setIsError(false);
    try {
      const res = await fetch("/api/admin/sync-candidates-to-sheet?apply=1");
      const data: SyncResponse = await res.json();
      if (!res.ok || !data.ok) {
        setIsError(true);
        setMessage(data.error ?? "同期に失敗しました");
        return;
      }
      const r = data.result;
      if (!r) {
        setMessage("同期しました");
        return;
      }
      const changed = r.updated + r.appended;
      setMessage(
        changed === 0
          ? "変更はありませんでした"
          : `${r.updated} 件更新 / ${r.appended} 件追加`,
      );
    } catch (e) {
      setIsError(true);
      setMessage(e instanceof Error ? e.message : "同期に失敗しました");
    } finally {
      setRunning(false);
      // 結果表示は少し残してから消す
      setTimeout(() => setMessage(null), 6000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message ? (
        <span className={`text-xs ${isError ? "text-red-600" : "text-gray-500"}`}>{message}</span>
      ) : null}
      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        title="システムでの変更をスプレッドシートに今すぐ反映します"
        className="rounded-lg border border-[var(--color-secondary)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)] disabled:opacity-50"
      >
        {running ? "反映中..." : "スプシに反映"}
      </button>
    </div>
  );
}
