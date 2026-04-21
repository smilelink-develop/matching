"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Person = {
  id: number;
  name: string;
  nationality: string;
  residenceStatus: string;
};

type ResumeTemplate = {
  id: number;
  name: string;
  templateUrl: string;
  driveFolderUrl: string;
};

type ResumeDocument = {
  id: number;
  title: string;
  status: string;
  documentUrl: string | null;
  driveFolderUrl: string;
  personName: string;
  templateName: string;
  createdAt: string;
};

export default function ResumesClient({
  persons,
  templates,
  documents: initialDocuments,
}: {
  persons: Person[];
  templates: ResumeTemplate[];
  documents: ResumeDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [resumeForm, setResumeForm] = useState({
    personId: persons[0]?.id ? String(persons[0].id) : "",
    templateId: templates[0]?.id ? String(templates[0].id) : "",
    title: "",
  });
  const [savingResume, setSavingResume] = useState(false);

  const selectedPerson = useMemo(
    () => persons.find((person) => String(person.id) === resumeForm.personId),
    [persons, resumeForm.personId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === resumeForm.templateId),
    [templates, resumeForm.templateId]
  );

  const createResume = async () => {
    if (!resumeForm.personId || !resumeForm.templateId) {
      alert("候補者と履歴書テンプレートを選択してください");
      return;
    }

    setSavingResume(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: Number(resumeForm.personId),
          templateId: Number(resumeForm.templateId),
          title:
            resumeForm.title.trim() ||
            `${selectedPerson?.name ?? "候補者"} 履歴書`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "履歴書の紐づけに失敗しました");
        return;
      }
      setDocuments((current) => [data.resume, ...current]);
      setResumeForm((current) => ({
        ...current,
        title: "",
      }));
      alert("Google Docs で履歴書を作成し、候補者の Drive フォルダに保存しました");
    } finally {
      setSavingResume(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">履歴書を作成</h2>
            <p className="mt-1 text-sm text-gray-500">
              候補者とテンプレートを選ぶと、Google Docs を複製し候補者の Drive フォルダへ保存します。
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            テンプレート管理 →
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] p-5 text-center">
            <p className="text-sm text-gray-500">
              履歴書テンプレートがまだ登録されていません。
            </p>
            <Link
              href="/settings"
              className="mt-3 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              設定でテンプレートを登録
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label="候補者">
              <select
                className={INPUT}
                value={resumeForm.personId}
                onChange={(e) => setResumeForm((c) => ({ ...c, personId: e.target.value }))}
              >
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} / {person.nationality}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="履歴書テンプレート">
              <select
                className={INPUT}
                value={resumeForm.templateId}
                onChange={(e) => setResumeForm((c) => ({ ...c, templateId: e.target.value }))}
              >
                <option value="">テンプレートを選択</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="履歴書名">
              <input
                className={INPUT}
                value={resumeForm.title}
                onChange={(e) => setResumeForm((c) => ({ ...c, title: e.target.value }))}
                placeholder={selectedPerson ? `${selectedPerson.name} 履歴書` : "履歴書タイトル"}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void createResume()}
                disabled={savingResume}
                className="h-[42px] rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                {savingResume ? "作成中..." : "Google Docsで作成"}
              </button>
            </div>
            {selectedTemplate ? (
              <p className="text-xs text-gray-400 lg:col-span-4">
                テンプレート: {selectedTemplate.templateUrl} / 初期保存先: {selectedTemplate.driveFolderUrl}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">最近の履歴書</h2>
        <div className="mt-4 flex flex-col gap-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-dark)]">{document.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {document.personName} / {document.templateName} / 作成{" "}
                    {new Date(document.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--color-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)]">
                    {document.status}
                  </span>
                  {document.documentUrl ? (
                    <a
                      href={document.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--color-secondary)] bg-white px-3 py-1 text-xs text-[var(--color-primary)] hover:bg-white/70"
                    >
                      Docsを開く
                    </a>
                  ) : null}
                  {document.driveFolderUrl ? (
                    <a
                      href={document.driveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      保管場所を開く
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
              まだ履歴書は登録されていません
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
