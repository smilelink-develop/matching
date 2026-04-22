"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Template = { id: number; name: string; content: string };

export default function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !content.trim()) { alert("名前とメッセージを入力してください"); return; }
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/templates/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, content }),
        });
        const data = await res.json();
        if (data.ok) { setTemplates((prev) => prev.map((t) => t.id === editId ? data.template : t)); reset(); }
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, content }),
        });
        const data = await res.json();
        if (data.ok) { setTemplates((prev) => [data.template, ...prev]); reset(); }
      }
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const startEdit = (t: Template) => { setEditId(t.id); setName(t.name); setContent(t.content); };
  const reset = () => { setEditId(null); setName(""); setContent(""); };

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <p className="font-semibold text-[var(--color-text-dark)]">{editId ? "テンプレートを編集" : "テンプレートを作成"}</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">テンプレート名</label>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="在留期限リマインド" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">メッセージ本文</label>
          <textarea className={`${INPUT} h-28 resize-none`} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="在留カードの有効期限が近づいています..." />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {saving ? "保存中..." : editId ? "更新" : "作成"}
          </button>
          {editId && <button onClick={reset} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">キャンセル</button>}
        </div>
      </div>

      <div className="max-h-[calc(100vh-12rem)] space-y-3 overflow-y-auto pr-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="font-medium text-[var(--color-text-dark)] text-sm">{t.name}</p>
              <div className="flex gap-3 text-xs">
                <button onClick={() => startEdit(t)} className="text-[var(--color-primary)] hover:underline">編集</button>
                <button onClick={() => del(t.id)} className="text-red-400 hover:underline">削除</button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{t.content}</p>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-gray-400 text-center py-6">テンプレートがありません</p>}
      </div>
    </div>
  );
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]";
