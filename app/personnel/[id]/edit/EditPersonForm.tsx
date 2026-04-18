"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  calculateAge,
  CHANNELS,
  GENDERS,
  getDocumentDefinitions,
  NATIONALITIES,
  normalizeWorkHistories,
  RESIDENCE_STATUSES,
  type WorkHistoryEntry,
} from "@/lib/candidate-profile";

type Person = {
  id: number;
  name: string;
  nationality: string;
  department: string | null;
  photoUrl: string | null;
  residenceStatus: string;
  partnerId: number | null;
  channel: string;
  lineUserId: string | null;
  messengerPsid: string | null;
  email: string | null;
  whatsappId: string | null;
  onboarding: {
    englishName: string | null;
    birthDate: string | null;
    phoneNumber: string | null;
    postalCode: string | null;
    address: string | null;
  } | null;
  resumeProfile: {
    gender: string | null;
    spouseStatus: string | null;
    childrenCount: string | null;
    visaExpiryDate: string | null;
    motivation: string | null;
    selfIntroduction: string | null;
    japanPurpose: string | null;
    currentJob: string | null;
    retirementReason: string | null;
    preferenceNote: string | null;
    japaneseLevel: string | null;
    japaneseLevelDate: string | null;
    licenseName: string | null;
    licenseExpiryDate: string | null;
    otherQualificationName: string | null;
    otherQualificationExpiryDate: string | null;
    traineeExperience: string | null;
    highSchoolName: string | null;
    highSchoolStartDate: string | null;
    highSchoolEndDate: string | null;
    universityName: string | null;
    universityStartDate: string | null;
    universityEndDate: string | null;
    workExperiences: unknown;
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

type PartnerOption = {
  id: number;
  name: string;
};

type DocumentInput = {
  kind: string;
  label: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  autoJudgeStatus: string;
  autoJudgeNote: string;
};

const SECTION_ITEMS = [
  { id: "basic", label: "基本情報" },
  { id: "qualification", label: "資格・学歴" },
  { id: "visa", label: "各在留資格" },
] as const;

export default function EditPersonForm({
  person,
  partners,
}: {
  person: Person;
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<(typeof SECTION_ITEMS)[number]["id"]>("basic");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: person.name,
    photoUrl: person.photoUrl ?? "",
    englishName: person.onboarding?.englishName ?? "",
    partnerId: person.partnerId ? String(person.partnerId) : "",
    nationality: person.nationality,
    residenceStatus: person.residenceStatus,
    channel: person.channel,
    phoneNumber: person.onboarding?.phoneNumber ?? "",
    gender: person.resumeProfile?.gender ?? "",
    birthDate: person.onboarding?.birthDate ?? "",
    postalCode: person.onboarding?.postalCode ?? "",
    address: person.onboarding?.address ?? "",
    spouseStatus: person.resumeProfile?.spouseStatus ?? "",
    childrenCount: person.resumeProfile?.childrenCount ?? "",
    motivation: person.resumeProfile?.motivation ?? "",
    selfIntroduction: person.resumeProfile?.selfIntroduction ?? "",
    japanPurpose: person.resumeProfile?.japanPurpose ?? "",
    currentJob: person.resumeProfile?.currentJob ?? "",
    retirementReason: person.resumeProfile?.retirementReason ?? "",
    preferenceNote: person.resumeProfile?.preferenceNote ?? "",
    visaExpiryDate: person.resumeProfile?.visaExpiryDate ?? "",
    japaneseLevel: person.resumeProfile?.japaneseLevel ?? "",
    japaneseLevelDate: person.resumeProfile?.japaneseLevelDate ?? "",
    licenseName: person.resumeProfile?.licenseName ?? "",
    licenseExpiryDate: person.resumeProfile?.licenseExpiryDate ?? "",
    otherQualificationName: person.resumeProfile?.otherQualificationName ?? "",
    otherQualificationExpiryDate: person.resumeProfile?.otherQualificationExpiryDate ?? "",
    traineeExperience: person.resumeProfile?.traineeExperience ?? "",
    highSchoolName: person.resumeProfile?.highSchoolName ?? "",
    highSchoolStartDate: person.resumeProfile?.highSchoolStartDate ?? "",
    highSchoolEndDate: person.resumeProfile?.highSchoolEndDate ?? "",
    universityName: person.resumeProfile?.universityName ?? "",
    universityStartDate: person.resumeProfile?.universityStartDate ?? "",
    universityEndDate: person.resumeProfile?.universityEndDate ?? "",
    workExperiences: withInitialWorkRow(normalizeWorkHistories(person.resumeProfile?.workExperiences)),
    lineUserId: person.lineUserId ?? "",
    messengerPsid: person.messengerPsid ?? "",
    email: person.email ?? "",
    whatsappId: person.whatsappId ?? "",
    documents: buildInitialDocuments(person.documents, person.residenceStatus),
  });

  const age = useMemo(() => calculateAge(form.birthDate), [form.birthDate]);
  const visibleDocuments = useMemo(
    () => mergeDocumentsForStatus(form.documents, form.residenceStatus),
    [form.documents, form.residenceStatus]
  );

  const setValue = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
      setValue("photoUrl", dataUrl);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateDocument = async (kind: string, file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルは5MB以下にしてください");
      return;
    }
    const fileUrl = await readFileAsDataUrl(file);
    setForm((current) => ({
      ...current,
      documents: upsertDocument(current.documents, {
        kind,
        label: getDocumentDefinitions(current.residenceStatus).find((document) => document.kind === kind)?.label ?? kind,
        fileName: file.name,
        fileUrl,
        mimeType: file.type,
        autoJudgeStatus: "accepted",
        autoJudgeNote: "管理画面から更新",
      }),
    }));
  };

  const updateWorkExperience = (index: number, key: keyof WorkHistoryEntry, value: string) => {
    setForm((current) => ({
      ...current,
      workExperiences: current.workExperiences.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, [key]: value } : entry
      ),
    }));
  };

  const addWorkExperience = () => {
    setForm((current) => ({
      ...current,
      workExperiences: [
        ...current.workExperiences,
        { companyName: "", startDate: "", endDate: "", reason: "" },
      ],
    }));
  };

  const removeWorkExperience = (index: number) => {
    setForm((current) => ({
      ...current,
      workExperiences: current.workExperiences.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      alert("カタカナ名を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/personnel/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partnerId: form.partnerId ? Number(form.partnerId) : null,
          workExperiences: form.workExperiences.filter(
            (entry) => entry.companyName || entry.startDate || entry.endDate || entry.reason
          ),
          documents: visibleDocuments,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(`更新失敗: ${result.error}`);
        return;
      }
      router.push("/personnel");
      router.refresh();
    } catch {
      alert("更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${person.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/personnel/${person.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(`削除失敗: ${result.error}`);
        return;
      }
      router.push("/personnel");
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="rounded-3xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-3">
        <div className="grid gap-2 md:grid-cols-3">
          {SECTION_ITEMS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                activeSection === section.id
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-white text-[var(--color-text-dark)] hover:bg-white/80"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] p-6">
        <p className="mb-4 text-sm font-medium text-[var(--color-text-dark)]">顔写真</p>
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
            {form.photoUrl ? (
              <button
                type="button"
                onClick={() => setValue("photoUrl", "")}
                className="block text-sm text-gray-500 hover:underline"
              >
                写真を削除
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {activeSection === "basic" ? (
        <section className="space-y-5">
          <SectionTitle title="基本情報" description="候補者の基本プロフィールと紹介パートナー、連絡先を管理します。" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="英語名">
              <input className={INPUT} value={form.englishName} onChange={(event) => setValue("englishName", event.target.value)} placeholder="NGUYEN VAN AN" />
            </Field>
            <Field label="カタカナ名 *">
              <input className={INPUT} value={form.name} onChange={(event) => setValue("name", event.target.value)} placeholder="グエン ヴァン アン" />
            </Field>
            <Field label="紹介パートナー">
              <select className={INPUT} value={form.partnerId} onChange={(event) => setValue("partnerId", event.target.value)}>
                <option value="">未設定</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="国籍">
              <select className={INPUT} value={form.nationality} onChange={(event) => setValue("nationality", event.target.value)}>
                {NATIONALITIES.map((nationality) => (
                  <option key={nationality}>{nationality}</option>
                ))}
              </select>
            </Field>
            <Field label="携帯番号">
              <input className={INPUT} value={form.phoneNumber} onChange={(event) => setValue("phoneNumber", event.target.value)} />
            </Field>
            <Field label="性別">
              <select className={INPUT} value={form.gender} onChange={(event) => setValue("gender", event.target.value)}>
                <option value="">未設定</option>
                {GENDERS.map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </Field>
            <Field label="生年月日">
              <input className={INPUT} type="date" value={form.birthDate} onChange={(event) => setValue("birthDate", event.target.value)} />
            </Field>
            <Field label="年齢">
              <input className={`${INPUT} bg-gray-50`} value={age} readOnly placeholder="自動計算" />
            </Field>
            <Field label="住所" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-28`} value={form.address} onChange={(event) => setValue("address", event.target.value)} />
            </Field>
            <Field label="郵便番号">
              <input className={INPUT} value={form.postalCode} onChange={(event) => setValue("postalCode", event.target.value)} />
            </Field>
            <Field label="配偶者">
              <input className={INPUT} value={form.spouseStatus} onChange={(event) => setValue("spouseStatus", event.target.value)} placeholder="有 / 無" />
            </Field>
            <Field label="子供">
              <input className={INPUT} value={form.childrenCount} onChange={(event) => setValue("childrenCount", event.target.value)} placeholder="0" />
            </Field>
            <Field label="志望動機" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.motivation} onChange={(event) => setValue("motivation", event.target.value)} />
            </Field>
            <Field label="自己紹介" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.selfIntroduction} onChange={(event) => setValue("selfIntroduction", event.target.value)} />
            </Field>
            <Field label="来日目的" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.japanPurpose} onChange={(event) => setValue("japanPurpose", event.target.value)} />
            </Field>
            <Field label="現在の仕事" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.currentJob} onChange={(event) => setValue("currentJob", event.target.value)} />
            </Field>
            <Field label="退職理由" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.retirementReason} onChange={(event) => setValue("retirementReason", event.target.value)} />
            </Field>
            <Field label="本人希望記入欄" className="md:col-span-2">
              <textarea className={`${INPUT} min-h-24`} value={form.preferenceNote} onChange={(event) => setValue("preferenceNote", event.target.value)} />
            </Field>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-5">
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">連絡先 ID</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="主な連絡手段">
                <select className={INPUT} value={form.channel} onChange={(event) => setValue("channel", event.target.value)}>
                  {CHANNELS.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="在留資格">
                <select className={INPUT} value={form.residenceStatus} onChange={(event) => setValue("residenceStatus", event.target.value)}>
                  {RESIDENCE_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="LINE userId">
                <input className={INPUT} value={form.lineUserId} onChange={(event) => setValue("lineUserId", event.target.value)} placeholder="Uxxxxxxxx" />
              </Field>
              <Field label="Messenger PSID">
                <input className={INPUT} value={form.messengerPsid} onChange={(event) => setValue("messengerPsid", event.target.value)} placeholder="1234567890" />
              </Field>
              <Field label="メールアドレス">
                <input className={INPUT} type="email" value={form.email} onChange={(event) => setValue("email", event.target.value)} placeholder="example@email.com" />
              </Field>
              <Field label="WhatsApp ID">
                <input className={INPUT} value={form.whatsappId} onChange={(event) => setValue("whatsappId", event.target.value)} placeholder="+81xxxxxxxxxx" />
              </Field>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "qualification" ? (
        <section className="space-y-5">
          <SectionTitle title="資格・学歴" description="在留資格、資格、学歴、職歴を候補者単位で整理します。" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="現在の在留資格">
              <select className={INPUT} value={form.residenceStatus} onChange={(event) => setValue("residenceStatus", event.target.value)}>
                {RESIDENCE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
            <Field label="在留資格の有効期限">
              <input className={INPUT} type="date" value={form.visaExpiryDate} onChange={(event) => setValue("visaExpiryDate", event.target.value)} />
            </Field>
            <Field label="日本語検定">
              <input className={INPUT} value={form.japaneseLevel} onChange={(event) => setValue("japaneseLevel", event.target.value)} placeholder="JLPT N3" />
            </Field>
            <Field label="取得日">
              <input className={INPUT} type="date" value={form.japaneseLevelDate} onChange={(event) => setValue("japaneseLevelDate", event.target.value)} />
            </Field>
            <Field label="免許">
              <input className={INPUT} value={form.licenseName} onChange={(event) => setValue("licenseName", event.target.value)} placeholder="普通自動車第一種免許" />
            </Field>
            <Field label="免許の有効期限">
              <input className={INPUT} type="date" value={form.licenseExpiryDate} onChange={(event) => setValue("licenseExpiryDate", event.target.value)} />
            </Field>
            <Field label="その他の資格">
              <input className={INPUT} value={form.otherQualificationName} onChange={(event) => setValue("otherQualificationName", event.target.value)} placeholder="介護初任者研修" />
            </Field>
            <Field label="その他資格の有効期限">
              <input className={INPUT} type="date" value={form.otherQualificationExpiryDate} onChange={(event) => setValue("otherQualificationExpiryDate", event.target.value)} />
            </Field>
            <Field label="実習経験の有無">
              <input className={INPUT} value={form.traineeExperience} onChange={(event) => setValue("traineeExperience", event.target.value)} placeholder="有 / 無 / 3年経験あり" />
            </Field>
          </div>

          <div className="grid gap-4 rounded-2xl border border-gray-200 bg-[var(--color-light)] p-5 md:grid-cols-3">
            <Field label="高校名" className="md:col-span-3">
              <input className={INPUT} value={form.highSchoolName} onChange={(event) => setValue("highSchoolName", event.target.value)} />
            </Field>
            <Field label="高校入学年月日">
              <input className={INPUT} type="date" value={form.highSchoolStartDate} onChange={(event) => setValue("highSchoolStartDate", event.target.value)} />
            </Field>
            <Field label="高校卒業年月日">
              <input className={INPUT} type="date" value={form.highSchoolEndDate} onChange={(event) => setValue("highSchoolEndDate", event.target.value)} />
            </Field>
            <div />
            <Field label="大学名" className="md:col-span-3">
              <input className={INPUT} value={form.universityName} onChange={(event) => setValue("universityName", event.target.value)} />
            </Field>
            <Field label="大学入学年月日">
              <input className={INPUT} type="date" value={form.universityStartDate} onChange={(event) => setValue("universityStartDate", event.target.value)} />
            </Field>
            <Field label="大学卒業年月日">
              <input className={INPUT} type="date" value={form.universityEndDate} onChange={(event) => setValue("universityEndDate", event.target.value)} />
            </Field>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">職歴</p>
                <p className="mt-1 text-xs text-gray-500">会社が複数ある場合は行を追加して管理できます。</p>
              </div>
              <button
                type="button"
                onClick={addWorkExperience}
                className="rounded-lg border border-[var(--color-secondary)] bg-white px-4 py-2 text-sm text-[var(--color-primary)]"
              >
                + 行を追加
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {form.workExperiences.map((entry, index) => (
                <div key={`${index}-${entry.companyName}`} className="rounded-2xl border border-white bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="会社名" className="md:col-span-2">
                      <input className={INPUT} value={entry.companyName} onChange={(event) => updateWorkExperience(index, "companyName", event.target.value)} />
                    </Field>
                    <Field label="入社年月日">
                      <input className={INPUT} type="date" value={entry.startDate} onChange={(event) => updateWorkExperience(index, "startDate", event.target.value)} />
                    </Field>
                    <Field label="退社年月日">
                      <input className={INPUT} type="date" value={entry.endDate} onChange={(event) => updateWorkExperience(index, "endDate", event.target.value)} />
                    </Field>
                    <Field label="退社理由" className="md:col-span-2">
                      <textarea className={`${INPUT} min-h-24`} value={entry.reason} onChange={(event) => updateWorkExperience(index, "reason", event.target.value)} />
                    </Field>
                  </div>
                  {form.workExperiences.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeWorkExperience(index)}
                      className="mt-3 text-sm text-red-500 hover:underline"
                    >
                      この行を削除
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "visa" ? (
        <section className="space-y-5">
          <SectionTitle title="各在留資格" description="在留資格ごとに必要な提出書類をまとめて管理します。" />
          <div className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-5">
            <p className="text-sm text-[var(--color-text-dark)]">
              現在の在留資格: <span className="font-semibold">{form.residenceStatus}</span>
            </p>
            {form.residenceStatus === "特定技能1号" ? (
              <p className="mt-2 text-xs text-gray-500">特定技能1号では、在留カードに加えて指定書と技能検定の合格証を管理します。</p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">現在は在留カードを基本書類として管理します。</p>
            )}
          </div>

          {visibleDocuments.map((document) => (
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
        </section>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm hover:bg-gray-50"
          >
            戻る
          </button>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:underline disabled:opacity-50"
        >
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]";

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

function buildInitialDocuments(documents: Person["documents"], residenceStatus: string): DocumentInput[] {
  return getDocumentDefinitions(residenceStatus).map((definition) => {
    const current = documents.find((document) => document.kind === definition.kind);
    return {
      kind: definition.kind,
      label: definition.label,
      fileName: current?.fileName ?? "",
      fileUrl: current?.fileUrl ?? "",
      mimeType: current?.mimeType ?? "",
      autoJudgeStatus: current?.autoJudgeStatus ?? "pending",
      autoJudgeNote: current?.autoJudgeNote ?? "",
    };
  });
}

function mergeDocumentsForStatus(documents: DocumentInput[], residenceStatus: string) {
  return getDocumentDefinitions(residenceStatus).map((definition) => {
    const current = documents.find((document) => document.kind === definition.kind);
    return current ?? {
      kind: definition.kind,
      label: definition.label,
      fileName: "",
      fileUrl: "",
      mimeType: "",
      autoJudgeStatus: "pending",
      autoJudgeNote: "",
    };
  });
}

function withInitialWorkRow(entries: WorkHistoryEntry[]) {
  return entries.length > 0 ? entries : [{ companyName: "", startDate: "", endDate: "", reason: "" }];
}

function upsertDocument(documents: DocumentInput[], nextDocument: DocumentInput) {
  const exists = documents.some((document) => document.kind === nextDocument.kind);
  if (!exists) return [...documents, nextDocument];
  return documents.map((document) => (document.kind === nextDocument.kind ? nextDocument : document));
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text-dark)]">{label}</label>
      {children}
    </div>
  );
}
