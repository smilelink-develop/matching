"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CloseButton from "@/app/components/CloseButton";

export type JobPostingRow = {
  id: number;
  title: string;
  status: string;
  documentUrl: string | null;
  driveFolderUrl: string | null;
  templateName: string | null;
  jobDescription: string | null;
  workLocation: string | null;
  headcount: string | null;
  monthlyGross: string | null;
  createdAt: string;
};

type ExtractedPosting = Record<string, string | null | undefined>;

export default function JobPostingsPanel({
  dealId,
  initialPostings,
}: {
  dealId: number;
  initialPostings: JobPostingRow[];
}) {
  const router = useRouter();
  const [postings, setPostings] = useState(initialPostings);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-dark)]">求人票</h3>
            <p className="mt-1 text-xs text-gray-500">
              この案件に紐づく求人票です。既存の他社求人票を AI で取り込むこともできます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-[var(--color-secondary)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
            >
              AIで取り込む
            </button>
            <Link
              href={`/job-postings?dealId=${dealId}`}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              求人票を作成
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {postings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              求人票はまだありません
            </p>
          ) : (
            postings.map((posting) => (
              <div key={posting.id} className="rounded-xl border border-gray-200 bg-[var(--color-light)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-dark)]">{posting.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {posting.templateName ?? "テンプレートなし"} /{" "}
                      {posting.workLocation ?? "勤務地未設定"} / {posting.headcount ?? "人数未定"}名 /{" "}
                      {posting.monthlyGross ? `${posting.monthlyGross}円` : "給与未設定"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)] border border-[var(--color-secondary)]">
                      {posting.status}
                    </span>
                    {posting.documentUrl ? (
                      <a
                        href={posting.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-[var(--color-secondary)] bg-white px-3 py-1 text-[11px] text-[var(--color-primary)] hover:bg-white/70"
                      >
                        Docsを開く
                      </a>
                    ) : null}
                    {posting.driveFolderUrl ? (
                      <a
                        href={posting.driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                      >
                        保管場所
                      </a>
                    ) : null}
                  </div>
                </div>
                {posting.jobDescription ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600 line-clamp-3">
                    {posting.jobDescription}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {importOpen ? (
        <AIImportModal
          dealId={dealId}
          onClose={() => setImportOpen(false)}
          onCreated={(row) => {
            setPostings((prev) => [row, ...prev]);
            setImportOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AIImportModal({
  dealId,
  onClose,
  onCreated,
}: {
  dealId: number;
  onClose: () => void;
  onCreated: (row: JobPostingRow) => void;
}) {
  const [files, setFiles] = useState<{ fileName: string; dataUrl: string }[]>([]);
  const [stage, setStage] = useState<"select" | "extracting" | "review" | "saving">("select");
  const [extracted, setExtracted] = useState<ExtractedPosting>({});
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const next: { fileName: string; dataUrl: string }[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} は 20MB を超えるためスキップしました`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ fileName: file.name, dataUrl });
    }
    setFiles((prev) => [...prev, ...next]);
  };

  const runExtract = async () => {
    if (files.length === 0) {
      alert("ファイルを1つ以上アップロードしてください");
      return;
    }
    setStage("extracting");
    setError(null);
    try {
      const response = await fetch(`/api/job-postings/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "抽出に失敗しました");
        setStage("select");
        return;
      }
      setExtracted(result.extracted ?? {});
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
      setStage("select");
    }
  };

  const save = async () => {
    setStage("saving");
    try {
      const response = await fetch(`/api/job-postings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, ...extracted }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "保存に失敗しました");
        setStage("review");
        return;
      }
      onCreated({
        id: result.jobPosting.id,
        title: result.jobPosting.title,
        status: result.jobPosting.status,
        documentUrl: result.jobPosting.documentUrl,
        driveFolderUrl: result.jobPosting.driveFolderUrl,
        templateName: result.jobPosting.template?.name ?? null,
        jobDescription: result.jobPosting.jobDescription,
        workLocation: result.jobPosting.workLocation,
        headcount: result.jobPosting.headcount,
        monthlyGross: result.jobPosting.monthlyGross,
        createdAt: result.jobPosting.createdAt,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "error");
      setStage("review");
    }
  };

  const updateField = (key: string, value: string) =>
    setExtracted((prev) => ({ ...prev, [key]: value }));

  const populated = EXTRACTED_FIELD_LABELS.filter((f) => {
    const v = extracted[f.key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-dark)]">AI で求人票を取り込む</h3>
            <p className="mt-0.5 text-xs text-gray-500">他社の求人票 PDF/画像から項目を抽出して、この案件の求人票として登録します</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {stage === "select" ? (
            <div className="space-y-3">
              <label
                className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] px-6 py-8 text-center hover:bg-white"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void addFiles(event.dataTransfer.files);
                }}
              >
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">
                  他社の求人票 PDF / 画像をドラッグ&ドロップ
                </p>
                <p className="mt-1 text-xs text-gray-500">複数ファイル / 1ファイル最大 20MB</p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>
              {files.length > 0 ? (
                <p className="text-xs text-gray-500">選択中: {files.length} 件</p>
              ) : null}
            </div>
          ) : null}

          {stage === "extracting" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-[var(--color-text-dark)]">AI が求人票を読み取っています...</p>
            </div>
          ) : null}

          {stage === "review" ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                抽出された {populated.length} 項目。必要に応じて編集してから保存してください。
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {populated.map((field) => (
                  <label key={field.key} className="block rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <span className="text-[10px] font-medium text-gray-500">{field.label}</span>
                    <input
                      value={String(extracted[field.key] ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="mt-1 w-full rounded border border-transparent bg-transparent px-0 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {stage === "saving" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-[var(--color-text-dark)]">保存しています...</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          {stage === "select" ? (
            <>
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void runExtract()}
                disabled={files.length === 0}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                AI で抽出
              </button>
            </>
          ) : null}
          {stage === "review" ? (
            <>
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void save()}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                この案件に保存
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EXTRACTED_FIELD_LABELS: { key: string; label: string }[] = [
  { key: "title", label: "タイトル" },
  { key: "jobDescription", label: "仕事内容" },
  { key: "workLocation", label: "勤務地" },
  { key: "nearestStation", label: "最寄り駅" },
  { key: "headcount", label: "募集人数" },
  { key: "gender", label: "性別" },
  { key: "nationality", label: "国籍" },
  { key: "workTime1Start", label: "勤務開始1" },
  { key: "workTime1End", label: "勤務終了1" },
  { key: "workTime2Start", label: "勤務開始2" },
  { key: "workTime2End", label: "勤務終了2" },
  { key: "overtime", label: "残業有無" },
  { key: "avgMonthlyOvertime", label: "月間平均残業時間" },
  { key: "fixedOvertimeHours", label: "固定残業時間" },
  { key: "fixedOvertimePay", label: "固定残業代" },
  { key: "monthlyGross", label: "月総支給額" },
  { key: "basicSalary", label: "基本給" },
  { key: "salaryCalcMethod", label: "給与計算方法" },
  { key: "perfectAttendance", label: "皆勤手当" },
  { key: "housingAllowance", label: "住宅手当" },
  { key: "nightShiftAllowance", label: "深夜手当" },
  { key: "commuteAllowance", label: "通勤手当" },
  { key: "socialInsurance", label: "社会保険料" },
  { key: "employmentInsurance", label: "雇用保険料" },
  { key: "healthInsurance", label: "健康保険料" },
  { key: "pensionInsurance", label: "厚生年金保険料" },
  { key: "incomeTax", label: "所得税" },
  { key: "residentTax", label: "住民税" },
  { key: "mealProvision", label: "食費支給" },
  { key: "mealAmount", label: "食費金額" },
  { key: "dormProvision", label: "寮支給" },
  { key: "dormAmount", label: "寮費金額" },
  { key: "utilitiesProvision", label: "光熱費支給" },
  { key: "utilitiesAmount", label: "光熱費金額" },
  { key: "holidays", label: "休日" },
  { key: "otherBenefits", label: "その他手当" },
  { key: "notes", label: "特記事項" },
];
