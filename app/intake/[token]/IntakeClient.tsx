"use client";

import { useMemo, useState } from "react";
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

type PageBlock = {
  title: string;
  description?: string;
  questions: (
    | { kind: "interview"; q: InterviewQuestion }
    | { kind: "custom"; q: CustomQuestion }
  )[];
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
  const [pageIdx, setPageIdx] = useState(0);

  // 1 ページ = 1 セクションでビルド。空セクション + カスタム質問ページを末尾に追加
  const pages = useMemo<PageBlock[]>(() => {
    const isAnswered = (q: InterviewQuestion): boolean => {
      if (q.existingField) return (initial[q.existingField] ?? "").trim().length > 0;
      return (initial.interviewAnswers[q.jsonKey ?? q.key] ?? "").trim().length > 0;
    };
    const result: PageBlock[] = [];
    for (const section of INTERVIEW_SECTIONS) {
      const qs = section.questions
        .filter((q) => !excludedKeys.includes(q.key) && !isAnswered(q))
        .map((q) => ({ kind: "interview" as const, q }));
      if (qs.length > 0) {
        result.push({ title: section.title, description: section.description, questions: qs });
      }
    }
    if (customQuestions.length > 0) {
      result.push({
        title: "担当者からの個別質問",
        questions: customQuestions.map((q) => ({ kind: "custom" as const, q })),
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedKeys, customQuestions, initial]);

  const totalPages = pages.length;
  const currentPage = pages[pageIdx];
  const isLastPage = pageIdx >= totalPages - 1;
  const progressPct = totalPages > 0 ? Math.round(((pageIdx + 1) / totalPages) * 100) : 0;

  const setExisting = (key: ExistingFields, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
  };
  const setAnswer = (key: string, value: string) => {
    setForm((c) => ({ ...c, interviewAnswers: { ...c.interviewAnswers, [key]: value } }));
  };

  // 必須カスタム質問の充足チェック (現ページ分)
  const currentPageInvalid = useMemo(() => {
    if (!currentPage) return false;
    for (const item of currentPage.questions) {
      if (item.kind === "custom" && item.q.required) {
        const v = form.interviewAnswers[item.q.key] ?? "";
        if (!v.trim()) return true;
      }
    }
    return false;
  }, [currentPage, form]);

  const next = () => {
    if (currentPageInvalid) {
      alert("必須の質問に回答してください / Please answer required fields.");
      return;
    }
    setPageIdx((i) => Math.min(i + 1, totalPages - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prev = () => {
    setPageIdx((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (currentPageInvalid) {
      alert("必須の質問に回答してください / Please answer required fields.");
      return;
    }
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
            onClick={() => { setSubmitted(false); setPageIdx(0); }}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            続けて編集する / Edit again
          </button>
        </div>
      </div>
    );
  }

  if (totalPages === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-light)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-md text-center space-y-3">
          <h1 className="text-base font-semibold text-[var(--color-text-dark)]">
            質問はありません / No questions
          </h1>
          <p className="text-sm text-gray-500">
            担当者へご連絡ください。<br />
            Please contact the recruiter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-light)] py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* ヘッダー (常時表示) */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-primary)]">SMILE MATCHING</p>
              <h1 className="mt-1 text-lg font-bold text-[var(--color-text-dark)]">
                事前質問フォーム / Pre-Interview
              </h1>
              <p className="mt-1 text-xs text-gray-500 truncate">
                {personName}
                {englishName ? ` / ${englishName}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-gray-500">
                {pageIdx + 1} / {totalPages}
              </p>
            </div>
          </div>
          {/* プログレスバー */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 現在のページ */}
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-base font-bold text-[var(--color-text-dark)]">{currentPage.title}</h2>
          {currentPage.description ? (
            <p className="mt-1 text-xs text-gray-500">{currentPage.description}</p>
          ) : null}
          <div className="mt-5 space-y-5">
            {currentPage.questions.map((item) =>
              item.kind === "interview" ? (
                <QuestionField
                  key={`i_${item.q.key}`}
                  label={item.q.question}
                  hint={item.q.hint}
                  type={item.q.type === "textarea" ? "textarea" : item.q.type === "select" ? "select" : "text"}
                  options={item.q.options}
                  value={
                    item.q.existingField
                      ? form[item.q.existingField]
                      : form.interviewAnswers[item.q.jsonKey ?? item.q.key] ?? ""
                  }
                  onChange={(v) => {
                    if (item.q.existingField) setExisting(item.q.existingField, v);
                    else setAnswer(item.q.jsonKey ?? item.q.key, v);
                  }}
                />
              ) : (
                <QuestionField
                  key={`c_${item.q.key}`}
                  label={item.q.label + (item.q.required ? " *" : "")}
                  type={item.q.type}
                  value={form.interviewAnswers[item.q.key] ?? ""}
                  onChange={(v) => setAnswer(item.q.key, v)}
                />
              )
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* ナビゲーション (sticky 下部) */}
        <div className="sticky bottom-3 z-10 rounded-2xl bg-white px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={pageIdx === 0}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30"
            >
              ← 戻る / Back
            </button>
            {isLastPage ? (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {submitting ? "送信中..." : "送信する / Submit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                次へ / Next →
              </button>
            )}
          </div>
        </div>
      </div>
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
          className="w-full min-h-[96px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
