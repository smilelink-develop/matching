"use client";

import { useMemo, useState } from "react";
import { CHANNELS } from "@/lib/candidate-profile";

type Partner = {
  id: number;
  name: string;
  country: string | null;
  channel: string | null;
  linkStatus: string;
  contactName: string | null;
  notes: string | null;
};

const DEFAULT_CHANNEL = CHANNELS[0]?.value ?? "";

const emptyForm = {
  name: "",
  country: "",
  channel: DEFAULT_CHANNEL,
  linkStatus: "未",
  contactName: "",
  notes: "",
};

export default function SharedPartnersClient({
  initialPartners,
}: {
  initialPartners: Partner[];
}) {
  const [partners, setPartners] = useState(initialPartners);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPartners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const haystack = [p.name, p.country, p.contactName, p.notes, channelLabel(p.channel)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [partners, searchTerm]);

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
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setEditForm({
      name: partner.name,
      country: partner.country ?? "",
      channel: partner.channel ?? DEFAULT_CHANNEL,
      linkStatus: partner.linkStatus,
      contactName: partner.contactName ?? "",
      notes: partner.notes ?? "",
    });
  };

  const saveEdit = async (id: number) => {
    if (!editForm.name.trim()) {
      alert("パートナー名を入力してください");
      return;
    }
    const response = await fetch(`/api/partners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      alert(result.error || "更新に失敗しました");
      return;
    }
    setPartners((current) => current.map((p) => (p.id === id ? result.partner : p)));
    setEditingId(null);
  };

  const deletePartner = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません`)) return;
    const response = await fetch(`/api/partners/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      alert(result.error || "削除に失敗しました");
      return;
    }
    setPartners((current) => current.filter((p) => p.id !== id));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">パートナーを追加</h2>
        <p className="mt-1 text-sm text-gray-500">海外紹介パートナーの台帳を全員で共有します。</p>
        <div className="mt-5 space-y-4">
          <Field label="パートナー名 *">
            <input className={INPUT} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          </Field>
          <Field label="国">
            <input className={INPUT} value={form.country} onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))} />
          </Field>
          <Field label="主な連絡手段">
            <select className={INPUT} value={form.channel} onChange={(e) => setForm((current) => ({ ...current, channel: e.target.value }))}>
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>{channel.label}</option>
              ))}
            </select>
          </Field>
          <Field label="連絡先紐づけ">
            <select className={INPUT} value={form.linkStatus} onChange={(e) => setForm((current) => ({ ...current, linkStatus: e.target.value }))}>
              <option value="未">未</option>
              <option value="完了">完了</option>
            </select>
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
            className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {saving ? "登録中..." : "パートナーを登録"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">
            パートナー一覧
            <span className="ml-2 text-xs font-normal text-gray-500">
              {searchTerm ? `${filteredPartners.length} / ${partners.length} 件` : `${partners.length} 件`}
            </span>
          </h2>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="名前・国・担当・メモで検索"
          />
        </div>
        <div className="mt-4 space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2">
          {filteredPartners.map((partner) =>
            editingId === partner.id ? (
              <div key={partner.id} className="rounded-2xl border border-[var(--color-secondary)] bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="パートナー名 *">
                    <input className={INPUT} value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} />
                  </Field>
                  <Field label="国">
                    <input className={INPUT} value={editForm.country} onChange={(e) => setEditForm((c) => ({ ...c, country: e.target.value }))} />
                  </Field>
                  <Field label="主な連絡手段">
                    <select className={INPUT} value={editForm.channel} onChange={(e) => setEditForm((c) => ({ ...c, channel: e.target.value }))}>
                      {CHANNELS.map((channel) => (
                        <option key={channel.value} value={channel.value}>{channel.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="連絡先紐づけ">
                    <select className={INPUT} value={editForm.linkStatus} onChange={(e) => setEditForm((c) => ({ ...c, linkStatus: e.target.value }))}>
                      <option value="未">未</option>
                      <option value="完了">完了</option>
                    </select>
                  </Field>
                  <Field label="担当者名" className="md:col-span-2">
                    <input className={INPUT} value={editForm.contactName} onChange={(e) => setEditForm((c) => ({ ...c, contactName: e.target.value }))} />
                  </Field>
                  <Field label="メモ" className="md:col-span-2">
                    <textarea className={`${INPUT} min-h-20`} value={editForm.notes} onChange={(e) => setEditForm((c) => ({ ...c, notes: e.target.value }))} />
                  </Field>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void saveEdit(partner.id)} className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm text-white hover:bg-[var(--color-primary-hover)]">保存</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">キャンセル</button>
                </div>
              </div>
            ) : (
              <div key={partner.id} className="relative rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4">
                <div className="absolute right-3 top-3 flex gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(partner)}
                    title="編集"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-white/80 text-gray-500 hover:bg-white hover:text-[var(--color-primary)]"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePartner(partner.id, partner.name)}
                    title="削除"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-white/80 text-gray-500 hover:bg-white hover:text-red-500"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <p className="pr-20 text-sm font-semibold text-[var(--color-text-dark)]">{partner.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(partner.country || "国未設定")} / {(channelLabel(partner.channel) || "連絡手段未設定")}
                </p>
                <p className="mt-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${partner.linkStatus === "完了" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                    連絡先紐づけ {partner.linkStatus}
                  </span>
                </p>
                {partner.contactName ? (
                  <p className="mt-2 text-sm text-gray-600">担当: {partner.contactName}</p>
                ) : null}
                {partner.notes ? <p className="mt-3 text-sm leading-6 text-gray-600">{partner.notes}</p> : null}
              </div>
            )
          )}
          {partners.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              まだパートナー情報がありません
            </p>
          ) : filteredPartners.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              「{searchTerm}」に一致するパートナーが見つかりません
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function channelLabel(value: string | null) {
  if (!value) return null;
  return CHANNELS.find((channel) => channel.value === value)?.label ?? value;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30";

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-xs">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "検索..."}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
