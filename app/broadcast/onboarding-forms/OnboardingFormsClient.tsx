"use client";

import { useState } from "react";

type Question = {
  id?: number;
  fixedKey?: string | null;
  label: string;
  type: "text" | "file";
  required: boolean;
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  questions: Question[];
};

const EMPTY_QUESTION = (): Question => ({
  label: "",
  type: "text",
  required: false,
});

export default function OnboardingFormsClient({
  templates: initial,
}: {
  templates: Template[];
}) {
  const [templates, setTemplates] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([EMPTY_QUESTION()]);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      alert("フォーム名を入力してください");
      return;
    }

    const sanitizedQuestions = questions.filter((question) => question.label.trim());
    if (sanitizedQuestions.length === 0) {
      alert("質問を1つ以上作成してください");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/onboarding-form-templates/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, questions: sanitizedQuestions }),
        });
        const data = await res.json();
        if (data.ok) {
          setTemplates((prev) =>
            prev.map((template) => (template.id === editId ? normalizeTemplate(data.template) : template))
          );
          reset();
        } else {
          alert(`更新失敗: ${data.error}`);
        }
      } else {
        const res = await fetch("/api/onboarding-form-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, questions: sanitizedQuestions }),
        });
        const data = await res.json();
        if (data.ok) {
          setTemplates((prev) => [normalizeTemplate(data.template), ...prev]);
          reset();
        } else {
          alert(`作成失敗: ${data.error}`);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("このフォームテンプレートを削除しますか？")) return;
    const res = await fetch(`/api/onboarding-form-templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      if (editId === id) {
        reset();
      }
    } else {
      alert(`削除失敗: ${data.error}`);
    }
  };

  const startEdit = (template: Template) => {
    setEditId(template.id);
    setName(template.name);
    setDescription(template.description ?? "");
    setQuestions(template.questions.length > 0 ? template.questions : [EMPTY_QUESTION()]);
  };

  const duplicateTemplate = (template: Template) => {
    setEditId(null);
    setName(`${template.name} コピー`);
    setDescription(template.description ?? "");
    setQuestions(
      template.questions.length > 0
        ? template.questions.map((question) => ({
            label: question.label,
            type: question.type,
            required: question.required,
          }))
        : [EMPTY_QUESTION()]
    );
  };

  const reset = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setQuestions([EMPTY_QUESTION()]);
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((current) =>
      current.map((question, currentIndex) =>
        currentIndex === index ? { ...question, ...patch } : question
      )
    );
  };

  const addQuestion = () => {
    setQuestions((current) => [...current, EMPTY_QUESTION()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [EMPTY_QUESTION()];
    });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_320px] gap-6">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[var(--color-text-dark)]">
                {editId ? "入力依頼フォームを編集" : "入力依頼フォームを作成"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                候補者の状況に合わせて、質問文・回答形式・必須設定を自由に組み立てます。
              </p>
            </div>
            {editId ? (
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                新規作成
              </button>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            <Field label="フォーム名">
              <input
                className={INPUT}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="事前面談前ヒアリングフォーム"
              />
            </Field>
            <Field label="説明">
              <textarea
                className={`${INPUT} min-h-24 resize-none`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="面談前に基本情報と希望条件を確認するフォームです"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-dark)]">質問一覧</p>
              <p className="mt-1 text-xs text-gray-500">質問は上から順に候補者へ表示されます。</p>
            </div>
            <button
              onClick={addQuestion}
              className="rounded-lg border border-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
            >
              質問を追加
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <div
                key={`${editId ?? "new"}-${index}`}
                className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--color-text-dark)]">質問 {index + 1}</p>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-50"
                    aria-label="質問を削除"
                    title="削除"
                  >
                    <TrashIcon />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <Field label="質問内容">
                    <input
                      className={INPUT}
                      value={question.label}
                      onChange={(event) => updateQuestion(index, { label: event.target.value })}
                      placeholder="例: 希望職種"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="回答形式">
                      <select
                        className={INPUT}
                        value={question.type}
                        onChange={(event) =>
                          updateQuestion(index, { type: event.target.value as Question["type"] })
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
                          updateQuestion(index, { required: event.target.value === "required" })
                        }
                      >
                        <option value="optional">任意</option>
                        <option value="required">必須</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? "保存中..." : editId ? "更新する" : "保存する"}
            </button>
            {(editId || name || description || questions.some((question) => question.label.trim())) && (
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:bg-gray-50"
              >
                リセット
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-dark)]">{template.name}</p>
                {template.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{template.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton onClick={() => startEdit(template)} title="編集">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => duplicateTemplate(template)} title="コピー">
                  <CopyIcon />
                </IconButton>
                <IconButton onClick={() => void remove(template.id)} title="削除" danger>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
            まだフォームがありません
          </p>
        ) : null}
      </div>
    </div>
  );
}

function normalizeTemplate(template: Template): Template {
  return {
    ...template,
    questions: template.questions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      fixedKey: question.fixedKey ?? null,
    })),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}

function IconButton({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg p-2 transition ${danger ? "text-red-400 hover:bg-red-50" : "text-[var(--color-primary)] hover:bg-[var(--color-light)]"}`}
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5Z" />
      <path d="m11.9 4.4 2.5 2.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="7" y="3" width="9" height="11" rx="2" />
      <path d="M5 7H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 5h14" />
      <path d="M8 5V3.5h4V5" />
      <path d="M5 5l1 11h8l1-11" />
    </svg>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
