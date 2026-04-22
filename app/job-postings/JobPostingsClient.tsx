"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Deal = {
  id: number;
  title: string;
  companyName: string;
};

type JobPostingTemplate = {
  id: number;
  name: string;
  templateUrl: string;
  driveFolderUrl: string | null;
};

type JobPostingDoc = {
  id: number;
  title: string;
  status: string;
  documentUrl: string | null;
  driveFolderUrl: string | null;
  dealTitle: string | null;
  companyName: string | null;
  templateName: string | null;
  createdAt: string;
};

type IncomingFile = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

export default function JobPostingsClient({
  deals,
  templates,
  documents: initialDocs,
}: {
  deals: Deal[];
  templates: JobPostingTemplate[];
  documents: JobPostingDoc[];
}) {
  const [documents, setDocuments] = useState(initialDocs);
  const [form, setForm] = useState({
    dealId: deals[0]?.id ? String(deals[0].id) : "",
    templateId: templates[0]?.id ? String(templates[0].id) : "",
    title: "",
  });
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const selectedDeal = useMemo(
    () => deals.find((deal) => String(deal.id) === form.dealId),
    [deals, form.dealId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === form.templateId),
    [templates, form.templateId]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">求人票を作成</h2>
            <p className="mt-1 text-sm text-gray-500">
              案件とテンプレートを選び、ファイルをAIで取り込んで求人票を作成します。
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            テンプレート管理
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] p-5 text-center">
            <p className="text-sm text-gray-500">求人票テンプレートがまだ登録されていません。</p>
            <Link
              href="/settings"
              className="mt-3 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              設定でテンプレートを登録
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="1. 案件を選択">
                <select
                  className={INPUT}
                  value={form.dealId}
                  onChange={(e) => setForm((current) => ({ ...current, dealId: e.target.value }))}
                >
                  <option value="">案件を選択</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.companyName} / {deal.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="2. テンプレートを選択">
                <select
                  className={INPUT}
                  value={form.templateId}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, templateId: e.target.value }))
                  }
                >
                  <option value="">テンプレートを選択</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="3. 求人票名を入力">
                <input
                  className={INPUT}
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder={
                    selectedDeal
                      ? `${selectedDeal.companyName} ${selectedDeal.title} 求人票`
                      : "求人票名"
                  }
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-3 text-sm text-gray-600">
              次へ進むと、元の求人票ファイルをアップロードしてAI取込できます。
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!form.dealId || !form.templateId) {
                    alert("案件とテンプレートを選択してください");
                    return;
                  }
                  setUploaderOpen(true);
                }}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
              >
                AI取込で作成
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-dark)]">最近作成した求人票</h2>
            <p className="mt-1 text-xs text-gray-500">
              作成済みのDocsと保管フォルダをここから開けます。
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-gray-200 bg-[var(--color-light)] px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-dark)]">{doc.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {doc.companyName ?? "-"} / {doc.dealTitle ?? "-"} /{" "}
                    {new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {doc.documentUrl ? (
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--color-secondary)] bg-white px-3 py-1 text-xs text-[var(--color-primary)] hover:bg-white/70"
                    >
                      Docsを開く
                    </a>
                  ) : null}
                  {doc.driveFolderUrl ? (
                    <a
                      href={doc.driveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      保管フォルダ
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
              まだ求人票は作成されていません
            </p>
          ) : null}
        </div>
      </section>

      {uploaderOpen && selectedDeal && selectedTemplate ? (
        <JobPostingUploadModal
          deal={selectedDeal}
          template={selectedTemplate}
          title={form.title.trim() || `${selectedDeal.companyName} ${selectedDeal.title} 求人票`}
          onClose={() => setUploaderOpen(false)}
          onCreated={(jobPosting) => {
            setDocuments((prev) => [
              {
                id: jobPosting.id,
                title: jobPosting.title,
                status: jobPosting.status,
                documentUrl: jobPosting.documentUrl ?? null,
                driveFolderUrl: jobPosting.driveFolderUrl ?? null,
                dealTitle: jobPosting.deal?.title ?? null,
                companyName: jobPosting.deal?.company?.name ?? null,
                templateName: jobPosting.template?.name ?? null,
                createdAt: jobPosting.createdAt,
              },
              ...prev,
            ]);
            setUploaderOpen(false);
            setForm((current) => ({ ...current, title: "" }));
          }}
        />
      ) : null}
    </div>
  );
}

function JobPostingUploadModal({
  deal,
  template,
  title,
  onClose,
  onCreated,
}: {
  deal: Deal;
  template: JobPostingTemplate;
  title: string;
  onClose: () => void;
  onCreated: (jobPosting: {
    id: number;
    title: string;
    status: string;
    documentUrl: string | null;
    driveFolderUrl: string | null;
    createdAt: string;
    deal?: { title?: string | null; company?: { name?: string | null } | null } | null;
    template?: { name?: string | null } | null;
  }) => void;
}) {
  const [files, setFiles] = useState<IncomingFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const next: IncomingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} は 20MB を超えるためアップロードできません`);
        continue;
      }
      const dataUrl = await readAsDataUrl(file);
      next.push({
        id: `${Date.now()}-${file.name}`,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl,
      });
    }
    setFiles((current) => [...current, ...next]);
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
  };

  const createFromFiles = async () => {
    if (files.length === 0) {
      alert("求人票の元ファイルをアップロードしてください");
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const extractRes = await fetch("/api/job-postings/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({
            fileName: file.fileName,
            dataUrl: file.dataUrl,
          })),
        }),
      });
      const extractResult = await extractRes.json();
      if (!extractRes.ok || !extractResult.ok) {
        setError(extractResult.error || "AI取込に失敗しました");
        return;
      }

      const createRes = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          templateId: template.id,
          title,
          ...extractResult.extracted,
        }),
      });
      const createResult = await createRes.json();
      if (!createRes.ok || !createResult.ok) {
        setError(createResult.error || "求人票の作成に失敗しました");
        return;
      }

      onCreated(createResult.jobPosting);
      alert("求人票を作成しました");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "エラーが発生しました");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
              AI取込
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-text-dark)]">
              求人票ファイルをアップロード
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              候補者の情報取込と同じように、元ファイルを読み取って求人票を作成します。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-3 text-sm text-gray-600">
          <p>
            案件: <span className="font-medium text-[var(--color-text-dark)]">{deal.companyName} / {deal.title}</span>
          </p>
          <p className="mt-1">
            テンプレート: <span className="font-medium text-[var(--color-text-dark)]">{template.name}</span>
          </p>
          <p className="mt-1">
            作成する求人票名: <span className="font-medium text-[var(--color-text-dark)]">{title}</span>
          </p>
        </div>

        <div className="mt-5 rounded-[24px] border border-dashed border-[var(--color-secondary)] bg-white p-6">
          <label className="block cursor-pointer text-center">
            <input
              type="file"
              className="hidden"
              accept=".pdf,image/*"
              multiple
              onChange={(e) => void addFiles(e.target.files)}
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-light)] text-[var(--color-primary)]">
              <UploadIcon />
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--color-text-dark)]">
              PDFや画像ファイルをアップロード
            </p>
            <p className="mt-1 text-xs text-gray-500">
              原本の求人票、求人票スクリーンショット、PDF資料などを読み取れます
            </p>
          </label>

          <div className="mt-5 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[var(--color-light)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-text-dark)]">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="rounded-lg px-3 py-1 text-xs text-gray-500 hover:bg-white"
                >
                  削除
                </button>
              </div>
            ))}
            {files.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                まだファイルは追加されていません
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={() => void createFromFiles()}
            disabled={extracting}
            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {extracting ? "取り込み中..." : "取り込んで求人票を作成"}
          </button>
        </div>
      </div>
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

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5" />
    </svg>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`${file.name} の読み込みに失敗しました`));
    reader.readAsDataURL(file);
  });
}

const INPUT =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
