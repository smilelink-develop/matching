"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NATIONALITIES = ["ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "その他"];
const RESIDENCE_STATUSES = ["技能実習", "特定技能1号", "特定技能2号", "技術・人文知識・国際業務"];
const CHANNELS = [
  { value: "LINE", label: "LINE" },
  { value: "Messenger", label: "Messenger" },
  { value: "mail", label: "メール" },
  { value: "WhatsApp", label: "WhatsApp" },
];

type Person = {
  id: number; name: string; nationality: string; department: string | null;
  photoUrl: string | null;
  residenceStatus: string; channel: string;
  lineUserId: string | null; messengerPsid: string | null;
  email: string | null; whatsappId: string | null;
  onboarding: {
    englishName: string | null;
    birthDate: string | null;
    phoneNumber: string | null;
    postalCode: string | null;
    address: string | null;
  } | null;
  documents: {
    kind: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    autoJudgeStatus: string;
    autoJudgeNote: string | null;
  }[];
};

type DocumentInput = {
  kind: "residence-card" | "certificate";
  label: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  autoJudgeStatus: string;
  autoJudgeNote: string;
};

export default function EditPersonForm({ person }: { person: Person }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: person.name,
    photoUrl: person.photoUrl ?? "",
    nationality: person.nationality,
    department: person.department ?? "",
    residenceStatus: person.residenceStatus,
    channel: person.channel,
    lineUserId: person.lineUserId ?? "",
    messengerPsid: person.messengerPsid ?? "",
    email: person.email ?? "",
    whatsappId: person.whatsappId ?? "",
    englishName: person.onboarding?.englishName ?? "",
    birthDate: person.onboarding?.birthDate ?? "",
    phoneNumber: person.onboarding?.phoneNumber ?? "",
    postalCode: person.onboarding?.postalCode ?? "",
    address: person.onboarding?.address ?? "",
    documents: buildInitialDocuments(person.documents),
  });

  const set = (k: string, v: string | DocumentInput[]) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("画像は3MB以下にしてください");
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      set("photoUrl", dataUrl);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("名前を入力してください"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/personnel/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) { alert(`更新失敗: ${data.error}`); return; }
      router.push("/personnel");
      router.refresh();
    } catch { alert("更新に失敗しました"); }
    finally { setSubmitting(false); }
  };

  const updateDocument = async (kind: DocumentInput["kind"], file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルは5MB以下にしてください");
      return;
    }

    const fileUrl = await readFileAsDataUrl(file);
    setForm((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.kind === kind
          ? {
              ...document,
              fileName: file.name,
              fileUrl,
              mimeType: file.type,
              autoJudgeStatus: "accepted",
              autoJudgeNote: "管理画面から更新",
            }
          : document
      ),
    }));
  };

  const handleDelete = async () => {
    if (!confirm(`「${person.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/personnel/${person.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) { alert(`削除失敗: ${data.error}`); return; }
      router.push("/personnel");
    } catch { alert("削除に失敗しました"); }
    finally { setDeleting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
      <div className="rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] p-6">
        <p className="text-sm font-medium text-[var(--color-text-dark)] mb-4">顔写真</p>
        <div className="flex items-center gap-5">
          <AvatarPreview name={form.name} photoUrl={form.photoUrl} />
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
              {uploadingPhoto ? "読み込み中..." : "写真をアップロード"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handlePhotoChange(event.target.files?.[0] ?? null)}
              />
            </label>
            {form.photoUrl && (
              <button
                type="button"
                onClick={() => set("photoUrl", "")}
                className="block text-sm text-gray-500 hover:underline"
              >
                写真を削除
              </button>
            )}
            <p className="text-xs text-gray-400">顔写真はチャットや一覧にも反映されます。</p>
          </div>
        </div>
      </div>
      <Field label="カタカナ名 *">
        <input className={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="グエン ヴァン アン" />
      </Field>
      <Field label="国籍">
        <select className={INPUT} value={form.nationality} onChange={(e) => set("nationality", e.target.value)}>
          {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </Field>
      <Field label="部署">
        <input className={INPUT} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="製造部" />
      </Field>
      <Field label="在留資格">
        <select className={INPUT} value={form.residenceStatus} onChange={(e) => set("residenceStatus", e.target.value)}>
          {RESIDENCE_STATUSES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="主な連絡手段">
        <select className={INPUT} value={form.channel} onChange={(e) => set("channel", e.target.value)}>
          {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>

      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">初期登録情報</p>
      <Field label="英語名">
        <input className={INPUT} value={form.englishName} onChange={(e) => set("englishName", e.target.value)} placeholder="NGUYEN VAN AN" />
      </Field>
      <Field label="生年月日">
        <input className={INPUT} type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
      </Field>
      <Field label="電話番号">
        <input className={INPUT} value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
      </Field>
      <Field label="郵便番号">
        <input className={INPUT} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </Field>
      <Field label="住所">
        <textarea className={`${INPUT} min-h-28`} value={form.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">提出書類</p>
      {form.documents.map((document) => (
        <div key={document.kind} className="rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-dark)]">{document.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                {document.fileName ? `現在のファイル: ${document.fileName}` : "まだ提出されていません"}
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] border border-[var(--color-secondary)]">
              {document.autoJudgeStatus === "accepted" ? "確認済み" : "要確認"}
            </span>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
            ファイルを差し替え
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => void updateDocument(document.kind, event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      ))}

      <hr className="border-gray-100" />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">連絡先ID</p>
      <Field label="LINE userId">
        <input className={INPUT} value={form.lineUserId} onChange={(e) => set("lineUserId", e.target.value)} placeholder="Uxxxxxxxx" />
      </Field>
      <Field label="Messenger PSID">
        <input className={INPUT} value={form.messengerPsid} onChange={(e) => set("messengerPsid", e.target.value)} placeholder="1234567890" />
      </Field>
      <Field label="メールアドレス">
        <input className={INPUT} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="example@email.com" />
      </Field>
      <Field label="WhatsApp ID（将来対応）">
        <input className={INPUT} value={form.whatsappId} onChange={(e) => set("whatsappId", e.target.value)} placeholder="＋81xxxxxxxxxx" />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button type="submit" disabled={submitting}
            className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {submitting ? "保存中..." : "保存"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="border border-gray-300 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
            戻る
          </button>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleting}
          className="text-red-500 text-sm hover:underline disabled:opacity-50">
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>
    </form>
  );
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]";

function AvatarPreview({ name, photoUrl }: { name: string; photoUrl: string }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name || "人材写真"}
        width={96}
        height={96}
        unoptimized
        className="h-24 w-24 rounded-2xl border border-gray-200 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-3xl font-bold text-white shadow-sm">
      {(name.trim()[0] ?? "人").toUpperCase()}
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildInitialDocuments(documents: Person["documents"]): DocumentInput[] {
  return [
    {
      kind: "residence-card",
      label: "在留カード",
      fileName: documents.find((document) => document.kind === "residence-card")?.fileName ?? "",
      fileUrl: documents.find((document) => document.kind === "residence-card")?.fileUrl ?? "",
      mimeType: documents.find((document) => document.kind === "residence-card")?.mimeType ?? "",
      autoJudgeStatus: documents.find((document) => document.kind === "residence-card")?.autoJudgeStatus ?? "pending",
      autoJudgeNote: documents.find((document) => document.kind === "residence-card")?.autoJudgeNote ?? "",
    },
    {
      kind: "certificate",
      label: "合格書",
      fileName: documents.find((document) => document.kind === "certificate")?.fileName ?? "",
      fileUrl: documents.find((document) => document.kind === "certificate")?.fileUrl ?? "",
      mimeType: documents.find((document) => document.kind === "certificate")?.mimeType ?? "",
      autoJudgeStatus: documents.find((document) => document.kind === "certificate")?.autoJudgeStatus ?? "pending",
      autoJudgeNote: documents.find((document) => document.kind === "certificate")?.autoJudgeNote ?? "",
    },
  ];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">{label}</label>
      {children}
    </div>
  );
}
