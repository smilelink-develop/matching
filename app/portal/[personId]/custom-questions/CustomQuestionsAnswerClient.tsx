"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Question = {
  id: number;
  label: string;
  type: string;
  required: boolean;
  answer: string | null;
  fileName: string | null;
  fileUrl: string | null;
};

type Draft = {
  id: number;
  type: string;
  answer: string;
  fileDataUrl: string | null;
  fileName: string | null;
};

export default function CustomQuestionsAnswerClient({
  personId,
  initialQuestions,
}: {
  personId: number;
  initialQuestions: Question[];
}) {
  const router = useRouter();
  const [questions] = useState(initialQuestions);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const map: Record<number, Draft> = {};
    for (const question of initialQuestions) {
      map[question.id] = {
        id: question.id,
        type: question.type,
        answer: question.answer ?? "",
        fileDataUrl: null,
        fileName: question.fileName ?? null,
      };
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);

  const setField = (id: number, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleFile = (id: number, file: File | null) => {
    if (!file) {
      setField(id, { fileDataUrl: null, fileName: null });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("ファイルは 10MB 以下にしてください");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setField(id, { fileDataUrl: result, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    for (const question of questions) {
      if (!question.required) continue;
      const draft = drafts[question.id];
      if (question.type === "file") {
        const hasExisting = Boolean(question.fileUrl);
        const hasNew = Boolean(draft?.fileDataUrl);
        if (!hasExisting && !hasNew) {
          alert(`「${question.label}」のファイルを添付してください`);
          return;
        }
      } else if (!draft?.answer?.trim()) {
        alert(`「${question.label}」を入力してください`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = Object.values(drafts).map((draft) => ({
        id: draft.id,
        type: draft.type,
        answer: draft.type === "text" ? draft.answer : null,
        fileDataUrl: draft.type === "file" ? draft.fileDataUrl : null,
        fileName: draft.type === "file" ? draft.fileName : null,
      }));
      const response = await fetch(`/api/portal/${personId}/custom-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "送信に失敗しました");
        return;
      }
      alert("ご回答ありがとうございました。");
      router.push(`/portal/${personId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <section className="rounded-[22px] border border-dashed border-[var(--color-secondary)] bg-white px-5 py-10 text-center text-sm text-[#64748B]">
        現在、回答する質問はありません。
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {questions.map((question) => {
        const draft = drafts[question.id];
        return (
          <div key={question.id} className="rounded-[20px] border border-[var(--color-secondary)] bg-white px-5 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--color-text-dark)]">{question.label}</p>
              {question.required ? (
                <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-medium text-[#B91C1C]">必須</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">任意</span>
              )}
            </div>
            {question.type === "file" ? (
              <div className="mt-3 space-y-2">
                {question.fileUrl ? (
                  <div className="rounded-lg bg-[var(--color-light)] px-3 py-2 text-xs text-[#64748B]">
                    現在のファイル:{" "}
                    <a href={question.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">
                      {question.fileName || "アップロード済み"}
                    </a>
                  </div>
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-secondary)] bg-[var(--color-light)] px-3 py-2 text-xs font-medium text-[var(--color-primary)]">
                  ファイルを選択
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => handleFile(question.id, event.target.files?.[0] ?? null)}
                  />
                </label>
                {draft?.fileName ? (
                  <p className="text-xs text-[#64748B]">選択中: {draft.fileName}</p>
                ) : null}
              </div>
            ) : (
              <textarea
                value={draft?.answer ?? ""}
                onChange={(event) => setField(question.id, { answer: event.target.value })}
                placeholder={question.required ? "回答を入力（必須）" : "回答を入力"}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                rows={3}
              />
            )}
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
        >
          {submitting ? "送信中..." : "回答を送信"}
        </button>
      </div>
    </section>
  );
}
