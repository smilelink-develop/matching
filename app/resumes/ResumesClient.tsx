"use client";

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
  templates: initialTemplates,
  documents: initialDocuments,
}: {
  persons: Person[];
  templates: ResumeTemplate[];
  documents: ResumeDocument[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [documents, setDocuments] = useState(initialDocuments);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    templateUrl: "",
    driveFolderUrl: "",
  });
  const [resumeForm, setResumeForm] = useState({
    personId: persons[0]?.id ? String(persons[0].id) : "",
    templateId: initialTemplates[0]?.id ? String(initialTemplates[0].id) : "",
    title: "",
    documentUrl: "",
  });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingResume, setSavingResume] = useState(false);

  const selectedPerson = useMemo(
    () => persons.find((person) => String(person.id) === resumeForm.personId),
    [persons, resumeForm.personId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === resumeForm.templateId),
    [templates, resumeForm.templateId]
  );

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.templateUrl.trim() || !templateForm.driveFolderUrl.trim()) {
      alert("テンプレート名、Google Docs テンプレートURL、保存先Drive URLを入力してください");
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await fetch("/api/resume-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "テンプレート保存に失敗しました");
        return;
      }
      setTemplates((current) => [data.template, ...current]);
      setTemplateForm({ name: "", templateUrl: "", driveFolderUrl: "" });
      if (!resumeForm.templateId) {
        setResumeForm((current) => ({ ...current, templateId: String(data.template.id) }));
      }
    } finally {
      setSavingTemplate(false);
    }
  };

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
          documentUrl: resumeForm.documentUrl.trim(),
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
        documentUrl: "",
      }));
      alert("履歴書情報を候補者に紐づけました");
    } finally {
      setSavingResume(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">履歴書テンプレート</h2>
          <p className="mt-1 text-sm text-gray-500">担当者ごとに使う Google Docs テンプレートと保存先 Drive を登録します。</p>
          <div className="mt-5 space-y-4">
            <Field label="テンプレート名">
              <input className={INPUT} value={templateForm.name} onChange={(e) => setTemplateForm((c) => ({ ...c, name: e.target.value }))} placeholder="標準履歴書" />
            </Field>
            <Field label="Google Docs テンプレートURL">
              <input className={INPUT} value={templateForm.templateUrl} onChange={(e) => setTemplateForm((c) => ({ ...c, templateUrl: e.target.value }))} placeholder="https://docs.google.com/document/d/..." />
            </Field>
            <Field label="保存先 Google Drive フォルダURL">
              <input className={INPUT} value={templateForm.driveFolderUrl} onChange={(e) => setTemplateForm((c) => ({ ...c, driveFolderUrl: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." />
            </Field>
            <button
              type="button"
              onClick={() => void saveTemplate()}
              disabled={savingTemplate}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            >
              {savingTemplate ? "保存中..." : "テンプレートを保存"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">履歴書を作成</h2>
          <p className="mt-1 text-sm text-gray-500">候補者とテンプレートを選び、作成後の Docs リンクを候補者データに紐づけます。</p>
          <div className="mt-5 space-y-4">
            <Field label="候補者">
              <select className={INPUT} value={resumeForm.personId} onChange={(e) => setResumeForm((c) => ({ ...c, personId: e.target.value }))}>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} / {person.nationality} / {person.residenceStatus}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="履歴書テンプレート">
              <select className={INPUT} value={resumeForm.templateId} onChange={(e) => setResumeForm((c) => ({ ...c, templateId: e.target.value }))}>
                <option value="">テンプレートを選択</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="履歴書名">
              <input className={INPUT} value={resumeForm.title} onChange={(e) => setResumeForm((c) => ({ ...c, title: e.target.value }))} placeholder={selectedPerson ? `${selectedPerson.name} 履歴書` : "履歴書タイトル"} />
            </Field>
            <Field label="作成後の Google Docs リンク">
              <input className={INPUT} value={resumeForm.documentUrl} onChange={(e) => setResumeForm((c) => ({ ...c, documentUrl: e.target.value }))} placeholder="https://docs.google.com/document/d/..." />
            </Field>
            <div className="rounded-xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-3 text-xs leading-6 text-[var(--color-text-dark)]">
              <p>テンプレート: {selectedTemplate?.templateUrl || "未選択"}</p>
              <p>保存先: {selectedTemplate?.driveFolderUrl || "未選択"}</p>
            </div>
            <button
              type="button"
              onClick={() => void createResume()}
              disabled={savingResume}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            >
              {savingResume ? "登録中..." : "履歴書を候補者に紐づける"}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">最近の履歴書</h2>
        <div className="mt-4 space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-dark)]">{document.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {document.personName} / {document.templateName}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)]">
                  {document.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p>Docs: {document.documentUrl || "未登録"}</p>
                <p>保存先: {document.driveFolderUrl}</p>
                <p>作成日: {new Date(document.createdAt).toLocaleDateString("ja-JP")}</p>
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
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
