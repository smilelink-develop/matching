"use client";

import { useState } from "react";

/**
 * SMILE MATCHING → スプシ (バックアップシート) の手動同期ボタン。
 * /personnel 画面右上に配置。
 */
export default function SyncSheetButton() {
  const [state, setState] = useState<"idle" | "running">("idle");

  const runSync = async () => {
    if (!confirm("SMILE MATCHING の全候補者をスプシに反映します (バックアップシートを全上書き)。よろしいですか?")) {
      return;
    }
    setState("running");
    try {
      const res = await fetch("/api/admin/sync-candidates-to-sheet?apply=1");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`同期失敗: ${data.error ?? res.statusText}`);
        return;
      }
      const r = data.result;
      alert(
        `✅ スプシ同期完了\n` +
          `  シート: ${r.sheetName}\n` +
          `  書き込み: ${r.rowsWritten} 行\n` +
          `  対象候補者: ${r.candidatesConsidered} 件`
      );
    } catch (e) {
      alert(`通信エラー: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setState("idle");
    }
  };

  return (
    <button
      onClick={runSync}
      disabled={state === "running"}
      className="rounded-lg border border-[var(--color-primary)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)] disabled:opacity-50"
      title="バックアップシートに全候補者を書き出します"
    >
      {state === "running" ? "同期中..." : "📤 スプシに反映"}
    </button>
  );
}
