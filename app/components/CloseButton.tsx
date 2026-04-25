"use client";

/**
 * モーダル右上に置く ✕ 閉じるボタン。文字 (閉じる) を表示すると
 * 折り返しでレイアウトが崩れる箇所が多いので、共通の ✕ アイコンに統一。
 */
export default function CloseButton({
  onClick,
  ariaLabel = "閉じる",
  size = "default",
}: {
  onClick: () => void;
  ariaLabel?: string;
  size?: "default" | "sm";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-base" : "h-8 w-8 text-lg";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-[var(--color-text-dark)]`}
    >
      ✕
    </button>
  );
}
