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
  const [saving, setSaving] = useState(false);

  const selectedDeal = useMemo(
    () => deals.find((d) => String(d.id) === form.dealId),
    [deals, form.dealId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === form.templateId),
    [templates, form.templateId]
  );

  const create = async () => {
    if (!form.dealId || !form.templateId) {
      alert("案件と求人票テンプレートを選択してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: Number(form.dealId),
          templateId: Number(form.templateId),
          title:
            form.title.trim() ||
            `${selectedDeal?.companyName ?? ""} ${selectedDeal?.title ?? ""} 求人票`.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "求人票の作成に失敗しました");
        return;
      }
      setDocuments((prev) => [
        {
          id: data.jobPosting.id,
          title: data.jobPosting.title,
          status: data.jobPosting.status,
          documentUrl: data.jobPosting.documentUrl ?? null,
          driveFolderUrl: data.jobPosting.driveFolderUrl ?? null,
          dealTitle: data.jobPosting.deal?.title ?? null,
          companyName: data.jobPosting.deal?.company?.name ?? null,
          templateName: data.jobPosting.template?.name ?? null,
          createdAt: data.jobPosting.createdAt,
        },
        ...prev,
      ]);
      setForm((c) => ({ ...c, title: "" }));
      alert("求人票を作成しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">求人票を作成</h2>
            <p className="mt-1 text-sm text-gray-500">
              案件を選ぶと、テンプレートを複製して案件に紐づく求人票として保存します。
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
            <p className="text-sm text-gray-500">求人票テンプレートがまだ登録されていません。</p>
            <Link
              href="/settings"
              className="mt-3 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              設定でテンプレートを登録
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label="案件">
              <select
                className={INPUT}
                value={form.dealId}
                onChange={(e) => setForm((c) => ({ ...c, dealId: e.target.value }))}
              >
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.companyName} / {deal.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="求人票テンプレート">
              <select
                className={INPUT}
                value={form.templateId}
                onChange={(e) => setForm((c) => ({ ...c, templateId: e.target.value }))}
              >
                <option value="">テンプレートを選択</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="求人票名">
              <input
                className={INPUT}
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder={selectedDeal ? `${selectedDeal.companyName} ${selectedDeal.title} 求人票` : "求人票タイトル"}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void create()}
                disabled={saving}
                className="h-[42px] rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                {saving ? "作成中..." : "Google Docsで作成"}
              </button>
            </div>
            {selectedTemplate ? (
              <p className="text-xs text-gray-400 lg:col-span-4">
                テンプレート: {selectedTemplate.templateUrl} / 保存先: {selectedTemplate.driveFolderUrl}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">最近の求人票</h2>
        <div className="mt-4 space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-dark)]">{doc.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {doc.companyName ?? "-"} / {doc.dealTitle ?? "-"} /{" "}
                    {doc.templateName ?? "テンプレートなし"} / 作成{" "}
                    {new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--color-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)]">
                    {doc.status}
                  </span>
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
                      保管場所
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
              まだ求人票は登録されていません
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
