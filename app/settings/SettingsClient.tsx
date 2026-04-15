"use client";

import { useState } from "react";
import type { FixedQuestionSetting } from "@/lib/app-settings";

export default function SettingsClient({
  initialSettings,
}: {
  initialSettings: {
    calendarEmbedUrl: string;
    calendarLabel: string;
    fixedQuestions: FixedQuestionSetting[];
  };
}) {
  const [calendarEmbedUrl, setCalendarEmbedUrl] = useState(initialSettings.calendarEmbedUrl);
  const [calendarLabel, setCalendarLabel] = useState(initialSettings.calendarLabel);
  const [fixedQuestions, setFixedQuestions] = useState(initialSettings.fixedQuestions);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [fixedQuestionsOpen, setFixedQuestionsOpen] = useState(false);

  const saveCalendar = async () => {
    setSavingCalendar(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarEmbedUrl,
          calendarLabel,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      alert("カレンダー設定を保存しました");
    } finally {
      setSavingCalendar(false);
    }
  };

  const clearCalendar = async () => {
    setCalendarEmbedUrl("");
    setCalendarLabel("");
    setSavingCalendar(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarEmbedUrl: "",
          calendarLabel: "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`解除失敗: ${data.error}`);
        return;
      }
      alert("カレンダー連携を解除しました");
    } finally {
      setSavingCalendar(false);
    }
  };

  const saveFixedQuestions = async () => {
    setSavingQuestions(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixedQuestions,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      setFixedQuestions(data.settings.fixedQuestions);
      alert("固定質問の設定を保存しました");
    } finally {
      setSavingQuestions(false);
    }
  };

  const updateFixedQuestion = (
    fixedKey: string,
    patch: Partial<FixedQuestionSetting>
  ) => {
    setFixedQuestions((current) =>
      current.map((question) =>
        question.fixedKey === fixedKey ? { ...question, ...patch } : question
      )
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setCalendarOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">カレンダー連携</h2>
            <p className="mt-1 text-sm text-gray-500">
              Google Calendar や Outlook Calendar の埋め込みURLを登録すると、カレンダー画面でそのまま表示します。
            </p>
          </div>
          <Chevron expanded={calendarOpen} />
        </button>

        {calendarOpen && (
          <div className="mt-5 space-y-4">
            <Field label="表示名">
              <input
                className={INPUT}
                value={calendarLabel}
                onChange={(event) => setCalendarLabel(event.target.value)}
                placeholder="Google Calendar"
              />
            </Field>
            <Field label="埋め込みURL">
              <input
                className={INPUT}
                value={calendarEmbedUrl}
                onChange={(event) => setCalendarEmbedUrl(event.target.value)}
                placeholder="https://calendar.google.com/calendar/embed?src=..."
              />
            </Field>
            <p className="text-xs text-gray-400">
              Google は「カレンダーを統合」から埋め込みURL、Outlook は公開URL/埋め込みURLを使ってください。
            </p>
            <div className="flex gap-3">
              <button
                onClick={saveCalendar}
                disabled={savingCalendar}
                className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {savingCalendar ? "保存中..." : "カレンダー設定を保存"}
              </button>
              <button
                onClick={clearCalendar}
                disabled={savingCalendar}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                リンクを解除
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setFixedQuestionsOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">固定質問の初期設定</h2>
            <p className="mt-1 text-sm text-gray-500">
              初期登録フォーム作成画面で最初に入る固定質問の表示名、回答形式、必須設定を変えられます。
            </p>
          </div>
          <Chevron expanded={fixedQuestionsOpen} />
        </button>

        {fixedQuestionsOpen && (
          <>
            <div className="mt-5 space-y-4">
              {fixedQuestions.map((question) => (
                <div key={question.fixedKey} className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] gap-3">
                    <Field label="質問名">
                      <input
                        className={INPUT}
                        value={question.label}
                        onChange={(event) => updateFixedQuestion(question.fixedKey, { label: event.target.value })}
                      />
                    </Field>
                    <Field label="回答形式">
                      <select
                        className={INPUT}
                        value={question.type}
                        onChange={(event) =>
                          updateFixedQuestion(question.fixedKey, {
                            type: event.target.value === "file" ? "file" : "text",
                          })
                        }
                      >
                        <option value="text">テキスト</option>
                        <option value="file">ファイル</option>
                      </select>
                    </Field>
                    <Field label="必須設定">
                      <select
                        className={INPUT}
                        value={question.required ? "required" : "optional"}
                        onChange={(event) =>
                          updateFixedQuestion(question.fixedKey, {
                            required: event.target.value === "required",
                          })
                        }
                      >
                        <option value="required">必須</option>
                        <option value="optional">任意</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <button
                onClick={saveFixedQuestions}
                disabled={savingQuestions}
                className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {savingQuestions ? "保存中..." : "固定質問を保存"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30";
