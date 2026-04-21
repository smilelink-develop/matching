"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PartnerOption = { id: number; name: string };
type LineEntry = { lineUserId: string; displayName: string | null; lastMessageText: string | null; lastSeenAt: string };
type MessengerEntry = { psid: string; lastMessageText: string | null; lastSeenAt: string };

export default function LinkPageClient({
  partners,
  unlinkedLine,
  unlinkedMessenger,
}: {
  partners: PartnerOption[];
  unlinkedLine: LineEntry[];
  unlinkedMessenger: MessengerEntry[];
}) {
  const router = useRouter();

  const link = async (partnerId: number, field: "lineUserId" | "messengerPsid", value: string) => {
    const res = await fetch(`/api/partners/${partnerId}/link-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      alert(`紐づけ失敗: ${data.error ?? "unknown"}`);
      return;
    }
    alert("紐づけ完了");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <Section
        title="LINE"
        badgeColor="bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
        count={unlinkedLine.length}
      >
        {unlinkedLine.map((entry) => (
          <ProfileRow
            key={entry.lineUserId}
            id={entry.lineUserId}
            displayName={entry.displayName}
            lastMessage={entry.lastMessageText}
            lastSeen={entry.lastSeenAt}
            partners={partners}
            onLink={(partnerId) => link(partnerId, "lineUserId", entry.lineUserId)}
          />
        ))}
        {unlinkedLine.length === 0 ? <Empty text="未紐づけの LINE ユーザーはいません" /> : null}
      </Section>

      <Section
        title="Messenger"
        badgeColor="bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]"
        count={unlinkedMessenger.length}
      >
        {unlinkedMessenger.map((entry) => (
          <ProfileRow
            key={entry.psid}
            id={entry.psid}
            displayName={null}
            lastMessage={entry.lastMessageText}
            lastSeen={entry.lastSeenAt}
            partners={partners}
            onLink={(partnerId) => link(partnerId, "messengerPsid", entry.psid)}
          />
        ))}
        {unlinkedMessenger.length === 0 ? <Empty text="未紐づけの Messenger ユーザーはいません" /> : null}
      </Section>

      <p className="text-xs text-gray-500">
        紐づけたいパートナーが一覧に無い場合は <Link href="/partners" className="text-[var(--color-primary)] hover:underline">パートナーリスト</Link> で先に登録してください。
      </p>
    </div>
  );
}

function Section({
  title,
  badgeColor,
  count,
  children,
}: {
  title: string;
  badgeColor: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${badgeColor}`}>{title}</span>
        <span className="text-sm text-gray-500">{count} 件</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function ProfileRow({
  id,
  displayName,
  lastMessage,
  lastSeen,
  partners,
  onLink,
}: {
  id: string;
  displayName: string | null;
  lastMessage: string | null;
  lastSeen: string;
  partners: PartnerOption[];
  onLink: (partnerId: number) => void;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        {displayName ? (
          <p className="text-sm font-medium text-[var(--color-text-dark)] truncate">{displayName}</p>
        ) : null}
        <p className="font-mono text-xs text-gray-500 truncate">{id}</p>
        <p className="mt-0.5 text-xs text-gray-400 truncate">
          最新: {lastMessage ?? "（メッセージなし）"} ·{" "}
          {new Date(lastSeen).toLocaleString("ja-JP")}
        </p>
      </div>
      <select
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="w-48 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
      >
        <option value="">パートナーを選択</option>
        {partners.map((partner) => (
          <option key={partner.id} value={partner.id}>
            {partner.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          if (!selected) {
            alert("パートナーを選択してください");
            return;
          }
          onLink(Number(selected));
        }}
        className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        紐づけ
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-gray-400">{text}</p>;
}
