"use client";

import { useState } from "react";

export default function IntakeLinkButton({ personId }: { personId: number }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const issue = async (regenerate = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/personnel/${personId}/intake-link${regenerate ? "?regenerate=1" : ""}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`発行失敗: ${data.error ?? res.statusText}`);
        return;
      }
      const origin = window.location.origin;
      setUrl(`${origin}${data.path}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("コピーできませんでした");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void issue(false)}
          disabled={loading}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? "発行中..." : url ? "URL を再表示" : "事前質問フォームの URL を発行"}
        </button>
        {url ? (
          <>
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-lg border border-[var(--color-primary)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
            >
              {copied ? "コピー完了" : "URL をコピー"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              プレビュー
            </a>
            <button
              type="button"
              onClick={() => {
                if (confirm("URL を再発行すると、旧 URL は使えなくなります。よろしいですか？")) {
                  void issue(true);
                }
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              再発行
            </button>
          </>
        ) : null}
      </div>
      {url ? (
        <div className="rounded-lg border border-gray-200 bg-[var(--color-light)] px-3 py-2">
          <p className="font-mono text-[11px] text-gray-700 break-all">{url}</p>
          <p className="mt-1.5 text-[11px] text-gray-500">
            この URL を LINE / Messenger / メール等でそのまま送ってください。候補者の回答は自動で
            この画面の事前質問欄に反映されます。
          </p>
        </div>
      ) : null}
    </div>
  );
}
