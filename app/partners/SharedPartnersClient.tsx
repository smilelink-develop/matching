"use client";

import { useState } from "react";

type Partner = {
  id: number;
  name: string;
  country: string | null;
  channel: string | null;
  contactName: string | null;
  notes: string | null;
};

export default function SharedPartnersClient({
  initialPartners,
}: {
  initialPartners: Partner[];
}) {
  const [partners, setPartners] = useState(initialPartners);
  const [form, setForm] = useState({
    name: "",
    country: "",
    channel: "",
    contactName: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      alert("パートナー名を入力してください");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "登録に失敗しました");
        return;
      }
      setPartners((current) => [result.partner, ...current]);
      setForm({
        name: "",
        country: "",
        channel: "",
        contactName: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0F172A]">パートナーを追加</h2>
        <p className="mt-1 text-sm text-gray-500">海外紹介パートナーの台帳を全員で共有します。</p>
        <div className="mt-5 space-y-4">
          <Field label="パートナー名 *">
            <input className={INPUT} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </Field>
          <Field label="国">
            <input className={INPUT} value={form.country} onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))} />
          </Field>
          <Field label="主な連絡手段">
            <input className={INPUT} value={form.channel} onChange={(e) => setForm((current) => ({ ...current, channel: e.target.value }))} placeholder="LINE / Messenger / WhatsApp" />
          </Field>
          <Field label="担当者名">
            <input className={INPUT} value={form.contactName} onChange={(e) => setForm((current) => ({ ...current, contactName: e.target.value }))} />
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
            {saving ? "登録中..." : "パートナーを登録"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0F172A]">共有パートナー一覧</h2>
        <div className="mt-4 space-y-3">
          {partners.map((partner) => (
            <div key={partner.id} className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4">
              <p className="text-sm font-semibold text-[#0F172A]">{partner.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {(partner.country || "国未設定")} / {(partner.channel || "連絡手段未設定")}
              </p>
              {partner.contactName ? (
                <p className="mt-2 text-sm text-gray-600">担当: {partner.contactName}</p>
              ) : null}
              {partner.notes ? <p className="mt-3 text-sm leading-6 text-gray-600">{partner.notes}</p> : null}
            </div>
          ))}
          {partners.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              まだパートナー情報がありません
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
