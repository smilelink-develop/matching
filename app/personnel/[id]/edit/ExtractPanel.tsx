"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type IncomingFile = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

type ExtractedCandidate = {
  name?: string;
  englishName?: string;
  nationality?: string;
  residenceStatus?: string;
  visaExpiryDate?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  spouseStatus?: string;
  childrenCount?: string;
  japaneseLevel?: string;
  japaneseLevelDate?: string;
  licenseName?: string;
  licenseExpiryDate?: string;
  otherQualificationName?: string;
  otherQualificationExpiryDate?: string;
  traineeExperience?: string;
  highSchoolName?: string;
  highSchoolStartDate?: string;
  highSchoolEndDate?: string;
  universityName?: string;
  universityStartDate?: string;
  universityEndDate?: string;
  motivation?: string;
  selfIntroduction?: string;
  japanPurpose?: string;
  currentJob?: string;
  retirementReason?: string;
  preferenceNote?: string;
  workExperiences?: { companyName?: string; startDate?: string; endDate?: string; reason?: string }[];
};

const FIELD_LABELS: { key: keyof ExtractedCandidate; label: string }[] = [
  { key: "name", label: "カナ名" },
  { key: "englishName", label: "英語名" },
  { key: "nationality", label: "国籍" },
  { key: "residenceStatus", label: "在留資格" },
  { key: "visaExpiryDate", label: "在留資格の有効期限" },
  { key: "birthDate", label: "生年月日" },
  { key: "gender", label: "性別" },
  { key: "phoneNumber", label: "携帯番号" },
  { key: "postalCode", label: "郵便番号" },
  { key: "address", label: "住所" },
  { key: "spouseStatus", label: "配偶者" },
  { key: "childrenCount", label: "子供" },
  { key: "japaneseLevel", label: "日本語検定" },
  { key: "japaneseLevelDate", label: "日本語検定取得日" },
  { key: "licenseName", label: "免許" },
  { key: "licenseExpiryDate", label: "免許の有効期限" },
  { key: "otherQualificationName", label: "その他の資格" },
  { key: "otherQualificationExpiryDate", label: "その他資格の有効期限" },
  { key: "traineeExperience", label: "実習経験" },
  { key: "highSchoolName", label: "高校名" },
  { key: "highSchoolStartDate", label: "高校入学" },
  { key: "highSchoolEndDate", label: "高校卒業" },
  { key: "universityName", label: "大学名" },
  { key: "universityStartDate", label: "大学入学" },
  { key: "universityEndDate", label: "大学卒業" },
  { key: "motivation", label: "志望動機" },
  { key: "selfIntroduction", label: "自己紹介" },
  { key: "japanPurpose", label: "来日目的" },
  { key: "currentJob", label: "現在の仕事" },
  { key: "retirementReason", label: "退職理由" },
  { key: "preferenceNote", label: "本人希望記入欄" },
];

export default function ExtractPanel({
  personId,
  personName,
}: {
  personId: number;
  personName: string;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="rounded-3xl border border-[var(--color-secondary)] bg-[linear-gradient(135deg,#F5F3FF_0%,#FDF4FF_100%)] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-primary)]">AI AUTO FILL</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-dark)]">書類から自動入力</h2>
          <p className="mt-1 text-xs text-gray-500">
            在留カード写真 / パスポート写真 / 履歴書 PDF などを投げ込むと、AI が候補者情報を抽出して自動入力します。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          書類をアップロード
        </button>
      </div>

      {modalOpen ? (
        <ExtractModal
          personId={personId}
          personName={personName}
          onClose={() => setModalOpen(false)}
          onApplied={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function ExtractModal({
  personId,
  personName,
  onClose,
  onApplied,
}: {
  personId: number;
  personName: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [files, setFiles] = useState<IncomingFile[]>([]);
  const [stage, setStage] = useState<"select" | "extracting" | "review">("select");
  const [extracted, setExtracted] = useState<ExtractedCandidate>({});
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ fileName: string; fileUrl: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const next: IncomingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} は 20MB を超えるためスキップしました`);
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
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const runExtract = async () => {
    if (files.length === 0) {
      alert("ファイルを1つ以上アップロードしてください");
      return;
    }
    setStage("extracting");
    setError(null);
    try {
      const response = await fetch(`/api/personnel/${personId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ fileName: f.fileName, dataUrl: f.dataUrl })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "抽出に失敗しました");
        setStage("select");
        return;
      }
      setExtracted(result.extracted ?? {});
      setDriveFolderUrl(result.driveFolderUrl ?? null);
      setUploaded(result.uploadedFiles ?? []);
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
      setStage("select");
    }
  };

  const updateField = (key: keyof ExtractedCandidate, value: string) => {
    setExtracted((prev) => ({ ...prev, [key]: value }));
  };

  const apply = async () => {
    setApplying(true);
    try {
      const response = await fetch(`/api/personnel/${personId}/apply-extracted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extracted }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || "反映に失敗しました");
        return;
      }
      alert("候補者情報に反映しました");
      onApplied();
    } finally {
      setApplying(false);
    }
  };

  const populatedFields = useMemo(
    () => FIELD_LABELS.filter((field) => nonEmptyString(extracted[field.key])),
    [extracted]
  );
  const emptyFields = useMemo(
    () => FIELD_LABELS.filter((field) => !nonEmptyString(extracted[field.key])),
    [extracted]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-dark)]">書類から自動入力</h3>
            <p className="mt-0.5 text-xs text-gray-500">{personName} さんの候補者情報を AI 抽出します</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {stage === "select" ? (
            <div className="space-y-4">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] px-6 py-8 text-center hover:bg-white">
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">ファイルをドラッグ&ドロップ または クリックして選択</p>
                <p className="mt-1 text-xs text-gray-500">
                  在留カード / パスポート / 履歴書など 画像 (JPEG/PNG) または PDF, 1ファイル最大 20MB
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>

              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text-dark)]">{file.fileName}</p>
                      <p className="text-xs text-gray-400">
                        {file.mimeType || "不明"} · {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:text-red-500"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {stage === "extracting" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-[var(--color-text-dark)]">AI が書類を読み取っています...</p>
              <p className="mt-1 text-xs text-gray-500">通常 30 秒〜1 分ほどかかります</p>
            </div>
          ) : null}

          {stage === "review" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                抽出が完了しました。内容を確認・修正してから反映してください。
              </div>

              {driveFolderUrl ? (
                <p className="text-xs text-gray-500">
                  アップロードした書類は{" "}
                  <a href={driveFolderUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">
                    候補者の保管場所
                  </a>{" "}
                  に保存されました ({uploaded.length} ファイル)
                </p>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-semibold text-[var(--color-text-dark)]">
                  抽出された項目 ({populatedFields.length})
                </p>
                <div className="space-y-2">
                  {populatedFields.map((field) => (
                    <div key={field.key} className="grid gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2">
                      <span className="text-xs font-medium text-gray-500">{field.label}</span>
                      <input
                        value={toInputValue(extracted[field.key])}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-[var(--color-light)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {Array.isArray(extracted.workExperiences) && extracted.workExperiences.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--color-text-dark)]">職歴 ({extracted.workExperiences.length})</p>
                  <div className="space-y-2">
                    {extracted.workExperiences.map((entry, index) => (
                      <div key={index} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                        <p className="font-medium text-[var(--color-text-dark)]">{entry.companyName ?? "(会社名不明)"}</p>
                        <p className="mt-1">
                          {entry.startDate ?? "?"} 〜 {entry.endDate ?? "?"}
                        </p>
                        {entry.reason ? <p className="mt-1 whitespace-pre-wrap">{entry.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {emptyFields.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--color-text-dark)]">抽出されなかった項目</p>
                  <div className="flex flex-wrap gap-1.5">
                    {emptyFields.map((field) => (
                      <span key={field.key} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-500">
                        {field.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    これらは候補者詳細画面上部の「入力フォーム作成」で本人に直接聞くこともできます。
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          {stage === "select" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
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
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void apply()}
                disabled={applying}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {applying ? "反映中..." : "候補者情報に反映"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function toInputValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
