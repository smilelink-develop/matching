"use client";

import { useState } from "react";

type Company = {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
  hiringStatus: string;
  notes: string | null;
};

export default function SharedCompaniesClient({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    location: "",
    hiringStatus: "募集中",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

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
      setCompanies((current) => [result.company, ...current]);
      setForm({
        name: "",
        industry: "",
        location: "",
        hiringStatus: "募集中",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0F172A]">企業を追加</h2>
        <p className="mt-1 text-sm text-gray-500">登録した企業は全メンバー共通で使います。</p>
        <div className="mt-5 space-y-4">
          <Field label="企業名 *">
            <input className={INPUT} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </Field>
          <Field label="業種">
            <input className={INPUT} value={form.industry} onChange={(e) => setForm((current) => ({ ...current, industry: e.target.value }))} />
          </Field>
          <Field label="所在地">
            <input className={INPUT} value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
          </Field>
          <Field label="採用状況">
            <input className={INPUT} value={form.hiringStatus} onChange={(e) => setForm((current) => ({ ...current, hiringStatus: e.target.value }))} />
          </Field>
          <Field label="メモ">
            <textarea className={`${INPUT} min-h-24`} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
          </Field>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="w-full rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {saving ? "登録中..." : "企業を登録"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0F172A]">共有企業一覧</h2>
        <div className="mt-4 space-y-3">
          {companies.map((company) => (
            <div key={company.id} className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{company.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {(company.industry || "業種未設定")} / {(company.location || "所在地未設定")}
                  </p>
                </div>
                <span className="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8]">
                  {company.hiringStatus}
                </span>
              </div>
              {company.notes ? <p className="mt-3 text-sm leading-6 text-gray-600">{company.notes}</p> : null}
            </div>
          ))}
          {companies.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              まだ企業情報がありません
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30";
