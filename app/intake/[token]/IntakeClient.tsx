"use client";

import { useState } from "react";
import { INTERVIEW_SECTIONS, type InterviewQuestion } from "@/lib/interview-questions";

type ExistingFields = "motivation" | "selfIntroduction" | "japanPurpose" | "currentJob" | "retirementReason";

type InitialAnswers = Record<ExistingFields, string> & {
  interviewAnswers: Record<string, string>;
};

type CustomQuestion = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "textarea";
};

export default function IntakeClient({
  token,
  personName,
  englishName,
  excludedKeys,
  customQuestions,
  initial,
}: {
  token: string;
  personName: string;
  englishName: string | null;
  excludedKeys: string[];
  customQuestions: CustomQuestion[];
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

  // 質問のフィルタリング:
  // 1. excludedKeys にある質問はスキップ
  // 2. 既に回答済みの質問はスキップ (再表示しない)
  // ※ 残った質問のみセクション内に表示。セクション全体が空なら非表示
  const isAnswered = (q: InterviewQuestion): boolean => {
    if (q.existingField) return (initial[q.existingField] ?? "").trim().length > 0;
    return (initial.interviewAnswers[q.jsonKey ?? q.key] ?? "").trim().length > 0;
  };
  const sectionsToShow = INTERVIEW_SECTIONS.map((section) => ({
    title: section.title,
    description: section.description,
    questions: section.questions.filter((q) => !excludedKeys.includes(q.key) && !isAnswered(q)),
  })).filter((section) => section.questions.length > 0);

  const totalQuestionsToShow =
    sectionsToShow.reduce((sum, s) => sum + s.questions.length, 0) + customQuestions.length;

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
          {totalQuestionsToShow === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-400">
              質問がありません。担当者へご連絡ください。
            </p>
          ) : null}
        </div>

        {sectionsToShow.map((section, sectionIdx) => (
          <section key={sectionIdx} className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-base font-bold text-[var(--color-text-dark)]">{section.title}</h2>
            {section.description ? (
              <p className="mt-1 text-xs text-gray-500">{section.description}</p>
            ) : null}
            <div className="mt-4 space-y-4">
              {section.questions.map((q) => (
                <QuestionField
                  key={q.key}
                  label={q.question}
                  hint={q.hint}
                  type={q.type === "textarea" ? "textarea" : q.type === "select" ? "select" : "text"}
                  options={q.options}
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

        {customQuestions.length > 0 ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-base font-bold text-[var(--color-text-dark)]">
              担当者からの個別質問 / Custom Questions
            </h2>
            <div className="mt-4 space-y-4">
              {customQuestions.map((q) => (
                <QuestionField
                  key={q.key}
                  label={q.label + (q.required ? " *" : "")}
                  type={q.type}
                  value={form.interviewAnswers[q.key] ?? ""}
                  onChange={(v) => setAnswer(q.key, v)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {totalQuestionsToShow > 0 ? (
          <div className="sticky bottom-4 z-10 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {submitting ? "送信中... / Submitting..." : "回答を送信する / Submit answers"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}

function QuestionField({
  label,
  hint,
  type,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  type: "text" | "textarea" | "select";
  options?: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1.5">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="w-full min-h-[88px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hint}
        />
      ) : type === "select" && options ? (
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">未選択</option>
          {options.map((opt) => (
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
          placeholder={hint}
        />
      )}
    </div>
  );
}
