"use client";

import { useState } from "react";
import { INTERVIEW_SECTIONS, type InterviewQuestion } from "@/lib/interview-questions";

type ExistingFields = "motivation" | "selfIntroduction" | "japanPurpose" | "currentJob" | "retirementReason";

type InitialAnswers = Record<ExistingFields, string> & {
  interviewAnswers: Record<string, string>;
};

export default function IntakeClient({
  token,
  personName,
  englishName,
  initial,
}: {
  token: string;
  personName: string;
  englishName: string | null;
  initial: InitialAnswers;
}) {
  const [form, setForm] = useState<InitialAnswers>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setExisting = (key: ExistingFields, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
  };
  const setAnswer = (key: string, value: string) => {
    setForm((c) => ({ ...c, interviewAnswers: { ...c.interviewAnswers, [key]: value } }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "送信に失敗しました");
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--color-light)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-dark)]">送信完了 / Thank you!</h1>
          <p className="text-sm text-gray-600">
            ご回答ありがとうございました。<br />
            Your answers have been submitted.
          </p>
          <p className="text-xs text-gray-400">
            必要であれば、このページを閉じて、追加で編集する場合は同じ URL を再度開いてください。
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            続けて編集する / Edit again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-light)] py-8 px-4">
      <form onSubmit={submit} className="max-w-3xl mx-auto space-y-5">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--color-primary)]">SMILE MATCHING</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-dark)]">
            事前質問フォーム / Pre-Interview Form
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {personName}
            {englishName ? ` / ${englishName}` : ""} さん
          </p>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            日本語で答えてください。わからない質問は空欄でも大丈夫です。/
            Please answer in Japanese. You can leave items blank if you don&apos;t know.
          </p>
        </div>

        {INTERVIEW_SECTIONS.map((section, sectionIdx) => (
          <section key={sectionIdx} className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-base font-bold text-[var(--color-text-dark)]">{section.title}</h2>
            {section.description ? (
              <p className="mt-1 text-xs text-gray-500">{section.description}</p>
            ) : null}
            <div className="mt-4 space-y-4">
              {section.questions.map((q) => (
                <QuestionField
                  key={q.key}
                  q={q}
                  value={
                    q.existingField
                      ? form[q.existingField]
                      : form.interviewAnswers[q.jsonKey ?? q.key] ?? ""
                  }
                  onChange={(v) => {
                    if (q.existingField) setExisting(q.existingField, v);
                    else setAnswer(q.jsonKey ?? q.key, v);
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 flex justify-center">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {submitting ? "送信中... / Submitting..." : "回答を送信する / Submit answers"}
          </button>
        </div>
      </form>
    </div>
  );
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: InterviewQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1.5">
        {q.question}
      </label>
      {q.type === "textarea" ? (
        <textarea
          className="w-full min-h-[88px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : q.type === "select" && q.options ? (
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">未選択</option>
          {q.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.hint}
        />
      )}
    </div>
  );
}
