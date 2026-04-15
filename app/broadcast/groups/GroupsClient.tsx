"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: number; name: string };
type Group = { id: number; name: string; members: Person[] };

export default function GroupsClient({ groups: initial, persons }: { groups: Group[]; persons: Person[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [newName, setNewName] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);

  const togglePerson = (id: number) =>
    setSelectedPersonIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const create = async () => {
    if (!newName.trim()) { alert("グループ名を入力してください"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, personIds: selectedPersonIds }),
      });
      const data = await res.json();
      if (data.ok) {
        setGroups((prev) => [data.group, ...prev]);
        setNewName(""); setSelectedPersonIds([]);
      } else { alert(`作成失敗: ${data.error}`); }
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("グループを削除しますか？")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 作成フォーム */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <p className="font-semibold text-[#0F172A]">グループを作成</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">グループ名</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ベトナム技能実習グループ"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            メンバーを選択 ({selectedPersonIds.length}名)
          </label>
          <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
            {persons.map((p) => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPersonIds.includes(p.id)}
                  onChange={() => togglePerson(p.id)}
                  className="accent-[#2563EB]"
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
        <button onClick={create} disabled={saving}
          className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1D4ED8] disabled:opacity-50">
          {saving ? "作成中..." : "作成"}
        </button>
      </div>

      {/* グループ一覧 */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-[#0F172A]">{g.name}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-gray-400">{g.members.length}名</span>
                <button onClick={() => del(g.id)} className="text-red-400 hover:underline">削除</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {g.members.map((m) => (
                <span key={m.id} className="text-xs bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-full">
                  {m.name}
                </span>
              ))}
              {g.members.length === 0 && <span className="text-xs text-gray-400">メンバーなし</span>}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-6">グループがありません</p>}
      </div>
    </div>
  );
}
