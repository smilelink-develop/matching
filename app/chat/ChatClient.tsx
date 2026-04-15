"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";

type Person = { id: number; name: string; channel: string; photoUrl: string | null; lineUserId: string | null; messengerPsid: string | null };
type Message = { id: number; personId: number | null; channel: string; direction: string; content: string; sentAt: string; readAt: string | null };
type Template = { id: number; name: string; content: string };

const CHANNEL_COLOR: Record<string, string> = {
  LINE: "bg-green-100 text-green-700",
  Messenger: "bg-blue-100 text-blue-700",
  mail: "bg-yellow-100 text-yellow-700",
  WhatsApp: "bg-emerald-100 text-emerald-700",
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Avatar({ name, photoUrl, className }: { name: string; photoUrl: string | null; className: string }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={44}
        height={44}
        unoptimized
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-[var(--color-primary)] text-white font-bold`}>
      {name[0]}
    </div>
  );
}

export default function ChatClient({ persons, initialMessages, templates }: {
  persons: Person[];
  initialMessages: Message[];
  templates: Template[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const markingReadRef = useRef<number | null>(null);

  const getLastMessage = (personId: number) =>
    messages
      .filter((message) => message.personId === personId)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
      .at(-1);

  const getUnreadCount = (personId: number) =>
    messages.filter(
      (message) =>
        message.personId === personId &&
        message.direction === "inbound" &&
        !message.readAt
    ).length;

  const filteredPersons = persons.filter((person) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;

    const lastMessage = getLastMessage(person.id);
    return (
      person.name.toLowerCase().includes(keyword) ||
      lastMessage?.content.toLowerCase().includes(keyword)
    );
  });

  const sortedPersons = [...filteredPersons].sort((a, b) => {
    const lastMessageA = getLastMessage(a.id);
    const lastMessageB = getLastMessage(b.id);
    const lastTimeA = lastMessageA ? new Date(lastMessageA.sentAt).getTime() : 0;
    const lastTimeB = lastMessageB ? new Date(lastMessageB.sentAt).getTime() : 0;

    if (lastTimeA !== lastTimeB) {
      return lastTimeB - lastTimeA;
    }

    return a.name.localeCompare(b.name, "ja");
  });

  const selected = persons.find((p) => p.id === selectedId);
  const chat = messages.filter((m) => m.personId === selectedId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, selectedId]);

  useEffect(() => {
    if (selectedId && sortedPersons.some((person) => person.id === selectedId)) {
      return;
    }

    setSelectedId(sortedPersons[0]?.id ?? null);
  }, [selectedId, sortedPersons]);

  const reload = async () => {
    setReloading(true);
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } finally {
      setReloading(false);
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void reload();
    }, 8000);

    const onFocus = () => {
      void reload();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const unreadMessages = messages.filter(
      (message) =>
        message.personId === selectedId &&
        message.direction === "inbound" &&
        !message.readAt
    );

    if (unreadMessages.length === 0 || markingReadRef.current === selectedId) return;

    const markRead = async () => {
      markingReadRef.current = selectedId;
      const readAt = new Date().toISOString();

      setMessages((current) =>
        current.map((message) =>
          message.personId === selectedId &&
          message.direction === "inbound" &&
          !message.readAt
            ? { ...message, readAt }
            : message
        )
      );

      try {
        const res = await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId: selectedId }),
        });

        if (!res.ok) {
          await reload();
        }
      } finally {
        markingReadRef.current = null;
      }
    };

    void markRead();
  }, [selectedId, messages]);

  const send = async () => {
    if (!input.trim() || !selected) return;
    if (!selected.lineUserId && !selected.messengerPsid) {
      alert("この人材にはIDが登録されていません");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/line/send-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: selected.id, message: input }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            personId: selected.id,
            channel: selected.channel,
            direction: "outbound",
            content: input,
            sentAt: new Date().toISOString(),
            readAt: null,
          },
        ]);
        setInput("");
      } else {
        alert(`送信失敗: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (content: string) => {
    setInput(content);
    setShowTemplates(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左: ユーザー一覧 */}
      <div className="w-[360px] border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-[var(--color-text-dark)]">チャット</span>
          <button
            onClick={reload}
            disabled={reloading}
            className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            {reloading ? "読込中..." : "メッセージ読み込み"}
          </button>
        </div>
        <div className="border-b border-gray-100 px-4 py-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="人材名やメッセージで検索"
            className="w-full rounded-xl border border-gray-200 bg-[var(--color-light)] px-4 py-2.5 text-sm text-[var(--color-text-dark)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedPersons.map((p) => {
            const lastMsg = getLastMessage(p.id);
            const unreadCount = getUnreadCount(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedId === p.id ? "bg-[var(--color-light)] border-l-2 border-l-[var(--color-primary)]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={p.name} photoUrl={p.photoUrl} className="h-10 w-10 shrink-0 rounded-full text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--color-text-dark)] truncate">{p.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {lastMsg && (
                          <span className="text-[11px] text-gray-400">
                            {formatDateLabel(lastMsg.sentAt)}
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <span className="min-w-5 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 truncate">{lastMsg?.content ?? "メッセージなし"}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {sortedPersons.length === 0 && (
            <p className="p-4 text-sm text-gray-400 text-center">人材が登録されていません</p>
          )}
        </div>
      </div>

      {/* 右: チャット画面 */}
      <div className="flex-1 flex flex-col bg-[var(--color-light)]">
        {selected ? (
          <>
            {/* ヘッダー */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
              <Avatar name={selected.name} photoUrl={selected.photoUrl} className="h-11 w-11 rounded-full" />
              <div>
                <p className="font-semibold text-[var(--color-text-dark)]">{selected.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLOR[selected.channel] ?? "bg-gray-100 text-gray-600"}`}>
                  {selected.channel}
                </span>
              </div>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {chat.length === 0 && (
                <p className="text-center text-sm text-gray-400 mt-10">メッセージはありません</p>
              )}
              {chat.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    m.direction === "outbound"
                      ? "bg-[var(--color-primary)] text-white rounded-br-sm"
                      : "bg-white text-[var(--color-text-dark)] border border-gray-200 rounded-bl-sm"
                  }`}>
                    <p>{m.content}</p>
                    <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(m.sentAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      {m.direction === "outbound" && " · 送信済み"}
                      {m.direction === "inbound" && m.readAt && " · 確認済み"}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* ショートカットボタン */}
            <div className="bg-white border-t border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="shrink-0 text-xs border border-[var(--color-primary)] text-[var(--color-primary)] px-3 py-1.5 rounded-full hover:bg-[var(--color-light)]"
              >
                テンプレート
              </button>
              <button
                onClick={() => setInput("書類のご提出をお願いします。")}
                className="shrink-0 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50"
              >
                書類提出依頼
              </button>
              <button
                onClick={() => setInput("面談の日程調整をお願いします。")}
                className="shrink-0 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50"
              >
                面談日程調整
              </button>
            </div>

            {/* テンプレートポップアップ */}
            {showTemplates && (
              <div className="bg-white border-t border-gray-200 px-4 py-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-400 mb-2">テンプレートを選択</p>
                {templates.length === 0 && (
                  <p className="text-sm text-gray-400">テンプレートがありません</p>
                )}
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.content)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-light)] text-sm mb-1"
                  >
                    <span className="font-medium text-[var(--color-text-dark)]">{t.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{t.content.slice(0, 30)}...</span>
                  </button>
                ))}
              </div>
            )}

            {/* 入力欄 */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
                placeholder="メッセージを入力..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {sending ? "送信中" : "送信"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            左から人材を選択してください
          </div>
        )}
      </div>
    </div>
  );
}
