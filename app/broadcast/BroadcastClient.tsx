"use client";

import { useState } from "react";

type Person = {
  id: number; name: string; nationality: string; department: string | null;
  residenceStatus: string; channel: string; lineUserId: string | null; messengerPsid: string | null;
};
type Template = { id: number; name: string; content: string };
type Group = { id: number; name: string; memberCount: number };

const NATIONALITIES = ["すべて", "ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "その他"];
const RESIDENCE_STATUSES = ["すべて", "技能実習", "特定技能1号", "特定技能2号", "技術・人文知識・国際業務"];

export default function BroadcastClient({ persons, templates, groups }: {
  persons: Person[];
  templates: Template[];
  groups: Group[];
}) {
  const [mode, setMode] = useState<"filter" | "group">("filter");
  const [nationality, setNationality] = useState("すべて");
  const [department, setDepartment] = useState("");
  const [residenceStatus, setResidenceStatus] = useState("すべて");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const departments = ["", ...Array.from(new Set(persons.map((p) => p.department).filter((d): d is string => d !== null)))];

  const filtered = persons.filter((p) => {
    if (nationality !== "すべて" && p.nationality !== nationality) return false;
    if (department && p.department !== department) return false;
    if (residenceStatus !== "すべて" && p.residenceStatus !== residenceStatus) return false;
    return true;
  });

  const targetCount = mode === "filter" ? filtered.length : (groups.find((g) => g.id === Number(selectedGroup))?.memberCount ?? 0);

  const applyTemplate = (id: string) => {
    const t = templates.find((t) => t.id === Number(id));
    if (t) setMessage(t.content);
    setSelectedTemplate(id);
  };

  const handleSend = async (scheduled = false) => {
    if (!message.trim()) { alert("メッセージを入力してください"); return; }
    if (scheduled && !scheduleDate) { alert("日時を選択してください"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          nationality: nationality === "すべて" ? null : nationality,
          department: department || null,
          residenceStatus: residenceStatus === "すべて" ? null : residenceStatus,
          groupId: selectedGroup ? Number(selectedGroup) : null,
          message,
          scheduledAt: scheduled ? scheduleDate : null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(scheduled
          ? `予約完了: ${data.scheduledAt} に ${data.targetCount} 件へ送信予定`
          : `送信完了: ${data.sentCount} 件成功 / ${data.failedCount} 件失敗`
        );
        setShowSchedule(false);
      } else {
        alert(`送信失敗: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      {/* 左: 設定 */}
      <div className="space-y-5">
        {/* 送信モード */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--color-text-dark)] mb-3">送信対象</p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode("filter")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "filter" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              フィルタ
            </button>
            <button onClick={() => setMode("group")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "group" ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              グループ
            </button>
          </div>

          {mode === "filter" ? (
            <div className="space-y-3">
              <Select label="国籍" value={nationality} onChange={setNationality} options={NATIONALITIES} />
              <Select label="在留資格" value={residenceStatus} onChange={setResidenceStatus} options={RESIDENCE_STATUSES} />
              <Select label="部署" value={department} onChange={setDepartment}
                options={departments} labels={departments.map((d) => d || "すべて")} />
            </div>
          ) : (
            <Select label="グループを選択" value={selectedGroup} onChange={setSelectedGroup}
              options={["", ...groups.map((g) => String(g.id))]}
              labels={["選択してください", ...groups.map((g) => `${g.name} (${g.memberCount}名)`)]} />
          )}
        </div>

        {/* メッセージ */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--color-text-dark)] mb-3">メッセージ</p>
          <Select label="テンプレート" value={selectedTemplate} onChange={applyTemplate}
            options={["", ...templates.map((t) => String(t.id))]}
            labels={["テンプレートを選択", ...templates.map((t) => t.name)]} />
          <textarea
            className="w-full mt-3 border border-gray-300 rounded-lg px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            placeholder="配信するメッセージを入力..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button onClick={() => handleSend(false)} disabled={sending}
            className="flex-1 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {sending ? "送信中..." : `この内容で配信 (${targetCount}件)`}
          </button>
          <button onClick={() => setShowSchedule(!showSchedule)}
            className="border border-[var(--color-primary)] text-[var(--color-primary)] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-light)]">
            予約
          </button>
        </div>

        {showSchedule && (
          <div className="bg-[var(--color-light)] border border-[var(--color-primary)]/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">送信予約</p>
            <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => handleSend(true)} disabled={sending}
              className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
              予約確定
            </button>
          </div>
        )}
      </div>

      {/* 右: プレビュー */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--color-text-dark)] mb-3">対象プレビュー ({targetCount} 件)</p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {(mode === "filter" ? filtered : []).map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {p.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-dark)]">{p.name}</p>
                <p className="text-xs text-gray-400">{p.nationality} · {p.residenceStatus}</p>
              </div>
              <span className="ml-auto text-xs text-gray-400">
                {p.lineUserId ? "LINE" : p.messengerPsid ? "MSG" : "未登録"}
              </span>
            </div>
          ))}
          {mode === "filter" && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">対象者がいません</p>
          )}
          {mode === "group" && (
            <p className="text-sm text-gray-400 text-center py-6">
              {selectedGroup ? `${targetCount} 名が対象` : "グループを選択してください"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, labels }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; labels?: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]">
        {options.map((o, i) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}
