"use client";

import { useState } from "react";
import type { FixedQuestionSetting } from "@/lib/app-settings";

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
  fixedQuestionDefaults,
}: {
  templates: Template[];
  fixedQuestionDefaults: FixedQuestionSetting[];
}) {
  const [templates, setTemplates] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fixedQuestions, setFixedQuestions] = useState<Question[]>(
    fixedQuestionDefaults.map((question) => ({ ...question }))
  );
  const [questions, setQuestions] = useState<Question[]>([EMPTY_QUESTION()]);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const mergeFixedQuestions = (questions: Question[]): Question[] => {
    return fixedQuestionDefaults.map((fixedQuestion) => {
      const savedQuestion = questions.find(
        (question) => question.fixedKey === fixedQuestion.fixedKey
      );
      return {
        ...fixedQuestion,
        required: savedQuestion?.required ?? fixedQuestion.required,
      };
    });
  };

  const save = async () => {
    if (!name.trim()) {
      alert("フォーム名を入力してください");
      return;
    }

    const sanitizedQuestions = questions.filter((question) => question.label.trim());

    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/onboarding-form-templates/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, fixedQuestions, questions: sanitizedQuestions }),
        });
        const data = await res.json();
        if (data.ok) {
          setTemplates((prev) => prev.map((template) => template.id === editId ? normalizeTemplate(data.template) : template));
          reset();
        } else {
          alert(`更新失敗: ${data.error}`);
        }
      } else {
        const res = await fetch("/api/onboarding-form-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, fixedQuestions, questions: sanitizedQuestions }),
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
    } else {
      alert(`削除失敗: ${data.error}`);
    }
  };

  const startEdit = (template: Template) => {
    setEditId(template.id);
    setName(template.name);
    setDescription(template.description ?? "");
    setFixedQuestions(mergeFixedQuestions(template.questions));
    setQuestions(
      template.questions.filter((question) => !question.fixedKey).length > 0
        ? template.questions.filter((question) => !question.fixedKey)
        : [EMPTY_QUESTION()]
    );
  };

  const reset = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setFixedQuestions(fixedQuestionDefaults.map((question) => ({ ...question })));
    setQuestions([EMPTY_QUESTION()]);
  };

  const updateFixedQuestion = (fixedKey: string, required: boolean) => {
    setFixedQuestions((current) =>
      current.map((question) =>
        question.fixedKey === fixedKey ? { ...question, required } : question
      )
    );
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
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#D6E4FF] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[#0F172A]">
                {editId ? "初期登録フォームを編集" : "初期登録フォームを作成"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                最初に必ず聞く項目は固定で入ります。追加で聞きたい内容だけ下に足してください。
              </p>
            </div>
            {editId && (
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                新規作成に戻す
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <Field label="フォーム名">
              <input
                className={INPUT}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="入社前登録フォーム"
              />
            </Field>
            <Field label="補足説明">
              <textarea
                className={`${INPUT} min-h-24 resize-none`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="入社前に必要な基本情報と書類を提出してください"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D6E4FF] bg-[#F8FBFF] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">固定で入る質問</p>
              <p className="mt-1 text-xs text-gray-500">この部分は全フォーム共通です。</p>
            </div>
            <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
              固定
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {fixedQuestions.map((question) => (
              <div
                key={question.fixedKey ?? question.label}
                className="flex items-center justify-between rounded-xl border border-[#D6E4FF] bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{question.label}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {question.type === "text" ? "テキスト入力" : "ファイル提出"}
                  </p>
                </div>
                <select
                  className={`rounded-lg px-3 py-2 text-xs font-medium focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${badgeClass(question.required)}`}
                  value={question.required ? "required" : "optional"}
                  onChange={(event) =>
                    updateFixedQuestion(
                      String(question.fixedKey ?? ""),
                      event.target.value === "required"
                    )
                  }
                >
                  <option value="required">必須</option>
                  <option value="optional">任意</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">追加質問</p>
              <p className="mt-1 text-xs text-gray-500">
                Google Form のように、質問文と回答形式を追加できます。
              </p>
            </div>
            <button
              onClick={addQuestion}
              className="rounded-lg border border-[#2563EB] px-3 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              質問を追加
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <div key={`${editId ?? "new"}-${index}`} className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[#0F172A]">質問 {index + 1}</p>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    削除
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <Field label="質問内容">
                    <input
                      className={INPUT}
                      value={question.label}
                      onChange={(event) => updateQuestion(index, { label: event.target.value })}
                      placeholder="例: 日本での職歴"
                    />
                  </Field>

                  <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3">
                    <Field label="回答形式">
                      <select
                        className={INPUT}
                        value={question.type}
                        onChange={(event) => updateQuestion(index, { type: event.target.value as Question["type"] })}
                      >
                        <option value="text">テキスト</option>
                        <option value="file">ファイル</option>
                      </select>
                    </Field>

                    <Field label="必須">
                      <select
                        className={INPUT}
                        value={question.required ? "required" : "optional"}
                        onChange={(event) => updateQuestion(index, { required: event.target.value === "required" })}
                      >
                        <option value="optional">任意</option>
                        <option value="required">必須</option>
                      </select>
                    </Field>

                    <Field label="表示">
                      <div className="flex h-[42px] items-center rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-500">
                        {question.type === "text" ? "入力欄" : "添付ボタン"}
                      </div>
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
              className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {saving ? "保存中..." : editId ? "更新する" : "テンプレートを作成"}
            </button>
            {editId && (
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{template.name}</p>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                )}
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => startEdit(template)} className="text-[#2563EB] hover:underline">
                  編集
                </button>
                <button onClick={() => remove(template.id)} className="text-red-400 hover:underline">
                  削除
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#D6E4FF] bg-[#F8FBFF] p-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>固定質問</span>
                <span>{fixedQuestionDefaults.length}件</span>
              </div>
              <div className="mt-2 space-y-1">
                {mergeFixedQuestions(template.questions).map((question) => (
                  <div key={question.fixedKey ?? question.label} className="flex items-center justify-between text-xs text-[#0F172A]">
                    <span>{question.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClass(question.required)}`}>
                      {question.required ? "必須" : "任意"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>追加質問</span>
                <span>{template.questions.length}件</span>
              </div>
              {template.questions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-400">
                  追加質問はありません
                </p>
              ) : (
                template.questions.map((question, index) => (
                  <div key={question.id ?? `${template.id}-${index}`} className="rounded-xl border border-gray-200 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{question.label}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {question.type === "text" ? "テキスト回答" : "ファイル提出"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeClass(question.required)}`}>
                        {question.required ? "必須" : "任意"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-400">
            初期登録フォームはまだありません
          </div>
        )}
      </div>
    </div>
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

function normalizeTemplate(template: Template): Template {
  return {
    ...template,
    questions: template.questions.map((question) => ({
      ...question,
      type: question.type === "file" ? "file" : "text",
    })),
  };
}

function badgeClass(required: boolean) {
  return required
    ? "bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]"
    : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]";
}
