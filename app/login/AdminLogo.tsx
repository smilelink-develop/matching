"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * ログイン画面左上のロゴ。3回連続クリックで管理者ショートカットログイン。
 */
export default function AdminLogo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    const next = count + 1;
    if (next < 3) {
      setCount(next);
      // 2秒操作がなければカウンタをリセット
      window.setTimeout(() => setCount(0), 2000);
      return;
    }
    setCount(0);
    setBusy(true);
    try {
      const nextPath = searchParams.get("next") || "/";
      const response = await fetch("/api/auth/admin-shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextPath }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "管理者ログインに失敗しました");
        return;
      }
      router.push(result.nextPath || "/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label="SMILE MATCHING"
      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-1 ring-white/20 transition hover:-translate-y-0.5"
    >
      <Image src="/logo.png" alt="SMILE MATCHING" width={48} height={48} className="h-full w-full object-contain" priority />
    </button>
  );
}
