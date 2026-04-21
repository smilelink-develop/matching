"use client";

import { useMemo, useState } from "react";

export type CustomQuestion = {
  id: number;
  label: string;
  type: string; // "text" | "file"
  required: boolean;
  answer: string | null;
  fileName: string | null;
  fileUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type ProfileSummary = {
  englishName: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  postalCode: string | null;
  address: string | null;
  gender: string | null;
  spouseStatus: string | null;
  childrenCount: string | null;
  motivation: string | null;
  selfIntroduction: string | null;
  japanPurpose: string | null;
  currentJob: string | null;
  retirementReason: string | null;
  preferenceNote: string | null;
  japaneseLevel: string | null;
  visaExpiryDate: string | null;
};

const KNOWN_LABELS: { key: keyof ProfileSummary; label: string }[] = [
  { key: "englishName", label: "英語名" },
  { key: "birthDate", label: "生年月日" },
  { key: "phoneNumber", label: "携帯番号" },
  { key: "postalCode", label: "郵便番号" },
  { key: "address", label: "住所" },
  { key: "gender", label: "性別" },
  { key: "spouseStatus", label: "配偶者" },
  { key: "childrenCount", label: "子供" },
  { key: "motivation", label: "志望動機" },
  { key: "selfIntroduction", label: "自己紹介" },
  { key: "japanPurpose", label: "来日目的" },
  { key: "currentJob", label: "現在の仕事" },
  { key: "retirementReason", label: "退職理由" },
  { key: "preferenceNote", label: "本人希望記入欄" },
  { key: "japaneseLevel", label: "日本語検定" },
  { key: "visaExpiryDate", label: "在留資格の有効期限" },
];

export default function CustomQuestionsPanel({
  personId,
  personName,
  initialQuestions,
  profile,
}: {
  personId: number;
  personName: string;
  initialQuestions: CustomQuestion[];
  profile: ProfileSummary;
}) {
  const [questions, setQuestions] = useState<CustomQuestion[]>(initialQuestions);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const activeQuestions = useMemo(
    () => questions.filter((q) => q.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [questions]
  );
  const archivedQuestions = useMemo(
    () => questions.filter((q) => !q.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [questions]
  );

  const missingKnown = useMemo(
    () => KNOWN_LABELS.filter((item) => !profile[item.key] || String(profile[item.key]).trim() === ""),
    [profile]
  );

  const updateAnswer = async (id: number, answer: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer } : q)));
  };

  const persistAnswer = async (id: number, answer: string) => {
    setSavingId(id);
    try {
      await fetch(`/api/personnel/${personId}/custom-questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">個別質問</h2>
          <p className="mt-1 text-xs text-gray-500">
            候補者ごとに任意の質問を追加できます。削除した質問は空欄として残ります。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          入力フォーム作成
        </button>
      </div>

      {activeQuestions.length === 0 && archivedQuestions.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          個別質問はまだありません。「入力フォーム作成」から質問を追加してください。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {activeQuestions.map((question) => (
            <div
              key={question.id}
              className="rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--color-text-dark)]">
                    {question.label}
                    {question.required ? <span className="ml-1 text-red-500">*</span> : null}
                  </p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)] border border-[var(--color-secondary)]">
                    {question.type === "file" ? "ファイル" : "テキスト"}
                  </span>
                </div>
              </div>
              {question.type === "file" ? (
                <div className="mt-2">
                  {question.fileUrl ? (
                    <a
                      href={question.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--color-primary)] underline"
                    >
                      {question.fileName || "アップロード済みファイル"}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">候補者の回答待ち</p>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={question.answer ?? ""}
                    onChange={(e) => void updateAnswer(question.id, e.target.value)}
                    onBlur={(e) => void persistAnswer(question.id, e.target.value)}
                    placeholder={question.required ? "（必須）候補者の回答" : "候補者の回答"}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    rows={2}
                  />
                  {savingId === question.id ? <p className="mt-1 text-[11px] text-gray-400">保存中...</p> : null}
                </>
              )}
            </div>
          ))}

          {archivedQuestions.map((question) => (
            <div
              key={question.id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 opacity-70"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-500 line-through">{question.label}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-400 border border-gray-200">削除済み</span>
              </div>
              <p className="mt-2 text-sm text-gray-400 italic">（空欄）</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <FormBuilderModal
          personId={personId}
          personName={personName}
          missingKnown={missingKnown}
          questions={questions}
          onClose={() => setModalOpen(false)}
          onChange={setQuestions}
        />
      ) : null}
    </section>
  );
}

function FormBuilderModal({
  personId,
  personName,
  missingKnown,
  questions,
  onClose,
  onChange,
}: {
  personId: number;
  personName: string;
  missingKnown: { key: keyof ProfileSummary; label: string }[];
  questions: CustomQuestion[];
  onClose: () => void;
  onChange: (next: CustomQuestion[]) => void;
}) {
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [newType, setNewType] = useState<"text" | "file">("text");

  const activeQuestions = questions.filter((q) => q.active);

  const addQuestion = async () => {
    if (!newLabel.trim()) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/personnel/${personId}/custom-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), required: newRequired, type: newType }),
      });
      const result = await response.json();
      if (result.ok) {
        onChange([...questions, result.question]);
        setNewLabel("");
        setNewRequired(false);
        setNewType("text");
      }
    } finally {
      setWorking(false);
    }
  };

  const updateQuestion = async (id: number, patch: Partial<Pick<CustomQuestion, "label" | "required" | "type">>) => {
    const previous = questions;
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    const response = await fetch(`/api/personnel/${personId}/custom-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const result = await response.json();
    if (!result.ok) {
      alert("更新に失敗しました");
      onChange(previous);
    }
  };

  const deleteQuestion = async (id: number) => {
    if (!confirm("この質問を削除しますか?（個別ページには空欄として残ります）")) return;
    const previous = questions;
    onChange(questions.map((q) => (q.id === id ? { ...q, active: false, answer: null } : q)));
    const response = await fetch(`/api/personnel/${personId}/custom-questions/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!result.ok) {
      alert("削除に失敗しました");
      onChange(previous);
    }
  };

  const send = async () => {
    if (activeQuestions.length === 0) {
      alert("送信できる質問がありません");
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/personnel/${personId}/custom-questions/send`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "送信に失敗しました");
        return;
      }
      alert(`候補者ポータルに「個別質問への回答」タスクを送信しました。\n${personName} さんのポータルで回答が入力されると、この画面に反映されます。`);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-dark)]">入力フォーム作成</h3>
            <p className="mt-0.5 text-xs text-gray-500">{personName} に送る入力フォームを組み立てます</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">未入力の基本項目</p>
            <p className="mt-0.5 text-xs text-gray-500">候補者情報のうちまだ埋まっていない項目です。必要に応じて候補者に聞いてください。</p>
            {missingKnown.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-sm text-gray-400">
                未入力項目はありません
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingKnown.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-medium text-[#92400E]"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">個別質問</p>
            <p className="mt-0.5 text-xs text-gray-500">
              質問の追加・任意/必須の切替・削除ができます。
            </p>

            <div className="mt-3 space-y-2">
              {activeQuestions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-400">
                  個別質問はまだありません
                </p>
              ) : null}
              {activeQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-[var(--color-light)] px-3 py-2"
                >
                  <input
                    value={question.label}
                    onChange={(e) => onChange(questions.map((q) => (q.id === question.id ? { ...q, label: e.target.value } : q)))}
                    onBlur={(e) => void updateQuestion(question.id, { label: e.target.value })}
                    className="min-w-[120px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
                  />
                  <select
                    value={question.type}
                    onChange={(e) => void updateQuestion(question.id, { type: e.target.value })}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="text">テキスト</option>
                    <option value="file">ファイル</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={question.required}
                      onChange={(e) => void updateQuestion(question.id, { required: e.target.checked })}
                      className="accent-[var(--color-primary)]"
                    />
                    必須
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteQuestion(question.id)}
                    title="削除"
                    className="rounded-lg border border-transparent p-1 text-gray-400 hover:border-gray-200 hover:text-red-500"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] px-3 py-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="新しい質問を入力"
                className="min-w-[140px] flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value === "file" ? "file" : "text")}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="text">テキスト</option>
                <option value="file">ファイル</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="accent-[var(--color-primary)]"
                />
                必須
              </label>
              <button
                type="button"
                onClick={() => void addQuestion()}
                disabled={working || !newLabel.trim()}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
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
