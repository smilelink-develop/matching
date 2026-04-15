"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Person = { id: number; name: string; contactName: string };
type LineEntry = { lineUserId: string; lastMessageText: string | null; lastSeenAt: string };
type MessengerEntry = { psid: string; lastMessageText: string | null; lastSeenAt: string };

export default function LinkPageClient({
  persons,
  unlinkedLine,
  unlinkedMessenger,
}: {
  persons: Person[];
  unlinkedLine: LineEntry[];
  unlinkedMessenger: MessengerEntry[];
}) {
  const router = useRouter();

  const link = async (personId: number, field: "lineUserId" | "messengerPsid", value: string) => {
    const res = await fetch(`/api/personnel/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (!data.ok) { alert(`紐づけ失敗: ${data.error}`); return; }
    alert("紐づけ完了");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* LINE */}
      <Section
        title="LINE"
        color="bg-green-50 border-green-200"
        badge="bg-green-100 text-green-700"
        count={unlinkedLine.length}
      >
        {unlinkedLine.map((entry) => (
          <ProfileRow
            key={entry.lineUserId}
            id={entry.lineUserId}
            lastMessage={entry.lastMessageText}
            lastSeen={entry.lastSeenAt}
            persons={persons}
            onLink={(personId) => link(personId, "lineUserId", entry.lineUserId)}
            newHref={`/personnel/new?lineUserId=${encodeURIComponent(entry.lineUserId)}`}
          />
        ))}
        {unlinkedLine.length === 0 && <Empty text="未紐づけのLINEユーザーはいません" />}
      </Section>

      {/* Messenger */}
      <Section
        title="Messenger"
        color="bg-blue-50 border-blue-200"
        badge="bg-blue-100 text-blue-700"
        count={unlinkedMessenger.length}
      >
        {unlinkedMessenger.map((entry) => (
          <ProfileRow
            key={entry.psid}
            id={entry.psid}
            lastMessage={entry.lastMessageText}
            lastSeen={entry.lastSeenAt}
            persons={persons}
            onLink={(personId) => link(personId, "messengerPsid", entry.psid)}
            newHref={`/personnel/new?messengerPsid=${encodeURIComponent(entry.psid)}`}
          />
        ))}
        {unlinkedMessenger.length === 0 && <Empty text="未紐づけのMessengerユーザーはいません" />}
      </Section>
    </div>
  );
}

function Section({ title, color, badge, count, children }: {
  title: string; color: string; badge: string; count: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${badge} ${color}`}>{title}</span>
        <span className="text-sm text-gray-500">{count} 件</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function ProfileRow({ id, lastMessage, lastSeen, persons, onLink, newHref }: {
  id: string; lastMessage: string | null; lastSeen: string;
  persons: Person[]; onLink: (personId: number) => void; newHref: string;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-gray-700 truncate">{id}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          最新: {lastMessage ?? "（メッセージなし）"} ·{" "}
          {new Date(lastSeen).toLocaleString("ja-JP")}
        </p>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-36"
      >
        <option value="">人材を選択</option>
        {persons.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button
        onClick={() => { if (selected) onLink(Number(selected)); else alert("人材を選択してください"); }}
        className="bg-[var(--color-primary)] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary-hover)]"
      >
        紐づけ
      </button>
      <Link href={newHref} className="text-xs text-gray-500 hover:underline whitespace-nowrap">
        新規登録
      </Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-gray-400">{text}</p>;
}
