"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [loginId, setLoginId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!loginId.trim() || !passcode.trim()) {
      alert("ログインIDとパスコードを入力してください");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId,
          passcode,
          nextPath,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "ログインに失敗しました");
        return;
      }

      window.location.href = result.nextPath || "/";
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/80">ログインID</label>
        <input
          className={INPUT}
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          placeholder="tsuchida / minh"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/80">パスコード</label>
        <input
          type="password"
          className={INPUT}
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          placeholder="6文字以上"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void submit();
            }
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
      >
        {saving ? "ログイン中..." : "ログイン"}
      </button>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-white/65">
        <p>初期アカウントは seed で作成します。</p>
        <p>例: tsuchida / minh / thuy / cindy</p>
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-white/15 bg-white/95 px-3 py-3 text-sm text-[var(--color-text-dark)] placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/35";
