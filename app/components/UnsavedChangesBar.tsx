"use client";

import type { ReactNode } from "react";

/**
 * 未保存の変更があるときに画面下部から出す保存バー。全画面で共通に使う。
 *
 * 白背景の半透明バーは背後のコンテンツに埋もれて見落とされるため、
 * Linear / Notion / Vercel などと同じく 濃色の不透明バー にして
 * 「画面の一部」ではなく「操作を促す通知」として見えるようにしている。
 */
export default function UnsavedChangesBar({
  visible,
  saving,
  onSave,
  onDiscard,
  message = "未保存の変更があります",
  saveLabel = "保存する",
  savingLabel = "保存中...",
  extra,
}: {
  visible: boolean;
  saving?: boolean;
  /** 未指定なら type="submit" のボタンになる (form 内で使う場合) */
  onSave?: () => void;
  /** 指定すると「変更を破棄」ボタンを出す */
  onDiscard?: () => void;
  message?: string;
  saveLabel?: string;
  savingLabel?: string;
  extra?: ReactNode;
}) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:pb-6">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-xl bg-[var(--color-text-dark)] px-5 py-3 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FBBF24] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
          </span>
          <span className="truncate text-sm font-medium text-white">{message}</span>
          {extra}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              破棄
            </button>
          ) : null}
          <button
            type={onSave ? "button" : "submit"}
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[var(--color-text-dark)] shadow-sm hover:bg-white/90 disabled:opacity-60"
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
