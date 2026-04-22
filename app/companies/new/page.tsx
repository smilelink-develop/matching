"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HIRING_STATUSES, SSW_INDUSTRIES } from "@/lib/company-options";

export default function NewCompanyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    externalId: "",
    name: "",
    industry: SSW_INDUSTRIES[0] as string,
    location: "",
    hiringStatus: "募集中",
    notes: "",
  });

  const submit = async () => {
    if (!form.name.trim()) {
      alert("企業名を入力してください");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "登録に失敗しました");
        return;
      }
      router.push(`/companies/${result.company.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-8 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-dark)]">企業を追加</h1>
          <p className="mt-2 text-sm text-gray-500">企業情報は全アカウント共通で利用されます。</p>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Field label="企業ID (任意、Drive フォルダ名に使用) 例: 14sv / ABC-001">
            <input
              className={INPUT}
              value={form.externalId}
              onChange={(e) => setForm((current) => ({ ...current, externalId: e.target.value }))}
              placeholder="空欄でも可"
            />
          </Field>
          <Field label="企業名 *">
            <input className={INPUT} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </Field>
          <Field label="業種 (特定技能16分野)">
            <select className={INPUT} value={form.industry} onChange={(e) => setForm((current) => ({ ...current, industry: e.target.value }))}>
              {SSW_INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </Field>
          <Field label="所在地">
            <input className={INPUT} value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
          </Field>
          <Field label="採用状況">
            <select className={INPUT} value={form.hiringStatus} onChange={(e) => setForm((current) => ({ ...current, hiringStatus: e.target.value }))}>
              {HIRING_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="メモ">
            <textarea className={`${INPUT} min-h-28`} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? "登録中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/companies")}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm hover:bg-gray-50"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30";
