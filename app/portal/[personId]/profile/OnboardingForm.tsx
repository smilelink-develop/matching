"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DocumentInput = {
  kind: "residence-card" | "certificate";
  label: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
};

export default function OnboardingForm({
  personId,
  personName,
  personPhotoUrl,
  initialData,
}: {
  personId: number;
  personName: string;
  personPhotoUrl: string | null;
  initialData: {
    englishName: string;
    birthDate: string;
    phoneNumber: string;
    postalCode: string;
    address: string;
    photoUrl: string;
    documents: DocumentInput[];
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: personName,
    englishName: initialData.englishName,
    birthDate: initialData.birthDate,
    phoneNumber: initialData.phoneNumber,
    postalCode: initialData.postalCode,
    address: initialData.address,
    photoUrl: initialData.photoUrl || personPhotoUrl || "",
    documents: initialData.documents,
  });

  const set = (key: keyof typeof form, value: string | DocumentInput[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateDocument = async (
    kind: DocumentInput["kind"],
    file: File | null
  ) => {
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
            }
          : document
      ),
    }));
  };

  const updatePhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("顔写真は画像を選択してください");
      return;
    }
    const photoUrl = await readFileAsDataUrl(file);
    set("photoUrl", photoUrl);
  };

  const goNext = () => {
    if (step === 0 && (!form.name.trim() || !form.birthDate.trim())) {
      alert("カタカナ名と生年月日を入力してください");
      return;
    }
    if (step === 1 && !form.address.trim()) {
      alert("住所を入力してください");
      return;
    }
    setStep((current) => Math.min(current + 1, 2));
  };

  const handleSubmit = async () => {
    const residenceCard = form.documents.find((document) => document.kind === "residence-card");
    const certificate = form.documents.find((document) => document.kind === "certificate");

    if (!residenceCard?.fileUrl || !certificate?.fileUrl) {
      alert("在留カードと合格書をアップロードしてください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${personId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      alert("初期登録を送信しました");
      router.push(`/portal/${personId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[var(--color-text-dark)]">登録ステップ</p>
        <div className="mt-4 flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-1 items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                index <= step ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-secondary)] text-[var(--color-primary)]"
              }`}>
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`h-1 flex-1 rounded-full ${index < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-secondary)]"}`} />
              )}
            </div>
          ))}
        </div>
      </section>

      {step === 0 && (
        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold text-[var(--color-text-dark)]">基本情報</p>
          <div className="mt-4 space-y-4">
            <Field label="カタカナ名 *">
              <input
                className={INPUT}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="グエン ヴァン アン"
              />
            </Field>
            <Field label="英語名">
              <input
                className={INPUT}
                value={form.englishName}
                onChange={(event) => set("englishName", event.target.value)}
                placeholder="NGUYEN VAN AN"
              />
            </Field>
            <Field label="生年月日 *">
              <input className={INPUT} type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} />
            </Field>
            <Field label="電話番号">
              <input className={INPUT} value={form.phoneNumber} onChange={(event) => set("phoneNumber", event.target.value)} />
            </Field>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold text-[var(--color-text-dark)]">住所</p>
          <div className="mt-4 space-y-4">
            <Field label="郵便番号">
              <input className={INPUT} value={form.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
            </Field>
            <Field label="住所 *">
              <textarea className={`${INPUT} min-h-28`} value={form.address} onChange={(event) => set("address", event.target.value)} />
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">顔写真</p>
            <div className="mt-4 flex items-center gap-4">
              <AvatarPreview name={form.name} photoUrl={form.photoUrl} />
              <label className="inline-flex cursor-pointer items-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">
                写真を選択
                <input type="file" accept="image/*" className="hidden" onChange={(event) => void updatePhoto(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          </section>

          {form.documents.map((document) => (
            <section
              key={document.kind}
              className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]"
            >
              <p className="text-sm font-semibold text-[var(--color-text-dark)]">{document.label}</p>
              <p className="mt-2 text-xs text-[#64748B]">画像またはPDFで提出できます。</p>
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] p-4">
                <p className="text-sm text-[var(--color-text-dark)]">
                  {document.fileName ? `選択中: ${document.fileName}` : "まだ提出されていません"}
                </p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">
                  ファイルを選択
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(event) => void updateDocument(document.kind, event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </section>
          ))}
        </section>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            className="flex-1 rounded-2xl border border-[var(--color-secondary)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-primary)]"
          >
            戻る
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]"
          >
            次へ
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)] disabled:opacity-50"
          >
            {submitting ? "送信中..." : "初期登録を送信"}
          </button>
        )}
      </div>
    </div>
  );
}

function AvatarPreview({ name, photoUrl }: { name: string; photoUrl: string }) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name || "顔写真"}
        width={88}
        height={88}
        unoptimized
        className="h-22 w-22 rounded-3xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-[88px] w-[88px] items-center justify-center rounded-3xl bg-[var(--color-primary)] text-3xl font-bold text-white">
      {name[0] ?? "人"}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-3 text-sm text-[var(--color-text-dark)] outline-none";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
