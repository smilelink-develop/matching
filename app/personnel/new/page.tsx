"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const NATIONALITIES = ["ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "その他"];
const RESIDENCE_STATUSES = ["技能実習", "特定技能1号", "特定技能2号", "技術・人文知識・国際業務"];
const CHANNELS = [
  { value: "LINE", label: "LINE" },
  { value: "Messenger", label: "Messenger" },
  { value: "mail", label: "メール（表示のみ）" },
  { value: "WhatsApp", label: "WhatsApp（表示のみ）" },
];

export default function NewPersonnelPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nationality: "ベトナム",
    department: "",
    residenceStatus: "技能実習",
    channel: "LINE",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("カタカナ名を入力してください"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) { alert(`登録失敗: ${data.error}`); return; }
      router.push("/personnel");
    } catch {
      alert("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-8 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">人材を追加</h1>
          <p className="text-sm text-gray-500 mt-2">
            人材の基本情報と主な連絡手段を登録します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5 shadow-sm">
        <Field label="カタカナ名 *">
          <input className={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="グエン ヴァン アン" />
        </Field>
        <Field label="国籍">
          <select className={INPUT} value={form.nationality} onChange={(e) => set("nationality", e.target.value)}>
            {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="部署">
          <input className={INPUT} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="製造部" />
        </Field>
        <Field label="在留資格">
          <select className={INPUT} value={form.residenceStatus} onChange={(e) => set("residenceStatus", e.target.value)}>
            {RESIDENCE_STATUSES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="主な連絡手段">
          <select className={INPUT} value={form.channel} onChange={(e) => set("channel", e.target.value)}>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="bg-[#2563EB] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#1D4ED8] disabled:opacity-50">
            {submitting ? "登録中..." : "登録"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
            キャンセル
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-1">{label}</label>
      {children}
    </div>
  );
}
