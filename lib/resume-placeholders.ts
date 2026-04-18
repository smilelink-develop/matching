type ResumeLine = {
  date?: string | null;
  label?: string | null;
  result?: string | null;
};

type ResumeProfileInput = {
  gender?: string | null;
  country?: string | null;
  spouseStatus?: string | null;
  childrenCount?: string | null;
  visaType?: string | null;
  visaExpiryDate?: string | null;
  educations?: unknown;
  workExperiences?: unknown;
  certifications?: unknown;
  motivation?: string | null;
  selfIntroduction?: string | null;
  japanPurpose?: string | null;
  currentJob?: string | null;
  retirementReason?: string | null;
  preferenceNote?: string | null;
  japaneseLevel?: string | null;
  japaneseLevelDate?: string | null;
  licenseName?: string | null;
  licenseExpiryDate?: string | null;
  otherQualificationName?: string | null;
  otherQualificationExpiryDate?: string | null;
  traineeExperience?: string | null;
  highSchoolName?: string | null;
  highSchoolStartDate?: string | null;
  highSchoolEndDate?: string | null;
  universityName?: string | null;
  universityStartDate?: string | null;
  universityEndDate?: string | null;
};

type ResumeDocumentInput = {
  person: {
    name: string;
    nationality: string;
    residenceStatus: string;
    email?: string | null;
    onboarding?: {
      englishName?: string | null;
      birthDate?: string | null;
      phoneNumber?: string | null;
      postalCode?: string | null;
      address?: string | null;
    } | null;
    resumeProfile?: ResumeProfileInput | null;
  };
};

function valueOrBlank(value?: string | null) {
  return value?.trim() || "";
}

function calcAge(birthDate?: string | null) {
  if (!birthDate) return "";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthPassed =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!monthPassed) age -= 1;
  return String(age);
}

function formatDateJapanese(dateInput?: string | null) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat("ja-JP").format(date);
}

function mapLine(lines: ResumeLine[] | null | undefined, index: number) {
  const line = lines?.[index];
  return {
    date: valueOrBlank(line?.date),
    label: valueOrBlank(line?.label),
    result: valueOrBlank(line?.result),
  };
}

function asResumeLines(value: unknown) {
  return Array.isArray(value) ? (value as ResumeLine[]) : [];
}

function asWorkLines(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((line) => {
    const current = typeof line === "object" && line !== null ? (line as Record<string, unknown>) : {};
    return {
      date: valueOrBlank(String(current.startDate ?? current.date ?? "")),
      label: valueOrBlank(String(current.companyName ?? current.label ?? "")),
      result: valueOrBlank(String(current.reason ?? current.result ?? "")),
    };
  });
}

export function buildResumePlaceholders(input: ResumeDocumentInput) {
  const person = input.person;
  const onboarding = person.onboarding;
  const profile = person.resumeProfile;
  const educationLines = asResumeLines(profile?.educations);
  const workLines = asWorkLines(profile?.workExperiences);
  const certLines = asResumeLines(profile?.certifications);
  const education1 = {
    date: valueOrBlank(profile?.highSchoolStartDate),
    label: valueOrBlank(profile?.highSchoolName),
    result: valueOrBlank(profile?.highSchoolEndDate),
  };
  const education2 = {
    date: valueOrBlank(profile?.universityStartDate),
    label: valueOrBlank(profile?.universityName),
    result: valueOrBlank(profile?.universityEndDate),
  };
  const education3 = mapLine(educationLines, 0);
  const work1 = mapLine(workLines, 0);
  const work2 = mapLine(workLines, 1);
  const work3 = mapLine(workLines, 2);
  const cert1 = {
    date: valueOrBlank(profile?.licenseExpiryDate),
    label: valueOrBlank(profile?.licenseName),
    result: "",
  };
  const cert2 = {
    date: valueOrBlank(profile?.japaneseLevelDate),
    label: valueOrBlank(profile?.japaneseLevel),
    result: "",
  };
  const cert3 = {
    date: valueOrBlank(profile?.otherQualificationExpiryDate),
    label: valueOrBlank(profile?.otherQualificationName),
    result: "",
  };
  const cert4 = mapLine(certLines, 0);

  return {
    作成日: new Intl.DateTimeFormat("ja-JP").format(new Date()),
    カタカナ名: valueOrBlank(person.name),
    英語名: valueOrBlank(onboarding?.englishName),
    顔写真: person.name ? "写真あり" : "",
    性別: valueOrBlank(profile?.gender),
    国籍: valueOrBlank(profile?.country) || valueOrBlank(person.nationality),
    生年月日: formatDateJapanese(onboarding?.birthDate),
    年齢: calcAge(onboarding?.birthDate),
    現住所: valueOrBlank(onboarding?.address),
    携帯電話: valueOrBlank(onboarding?.phoneNumber),
    電話: "",
    メール: valueOrBlank(person.email),
    ビザの種類: valueOrBlank(profile?.visaType) || valueOrBlank(person.residenceStatus),
    在留資格: valueOrBlank(person.residenceStatus),
    在留資格の有効期限: valueOrBlank(profile?.visaExpiryDate),
    配偶者: valueOrBlank(profile?.spouseStatus),
    子供数: valueOrBlank(profile?.childrenCount),
    子供: valueOrBlank(profile?.childrenCount),
    就労ビザ: "",
    備考欄: valueOrBlank(profile?.traineeExperience),
    入学1: education1.date,
    高校名: education1.label,
    卒業1: education1.result,
    入学2: education2.date,
    学校名2: education2.label,
    卒業2: education2.result,
    入学3: education3.date,
    学校名3: education3.label,
    卒業3: education3.result,
    入社1: work1.date,
    会社名1: work1.label,
    退社1ラベル: work1.result,
    入社2: work2.date,
    会社名2: work2.label,
    退社2ラベル: work2.result,
    入社3: work3.date,
    会社名3: work3.label,
    退社3ラベル: work3.result,
    免許年: cert1.date,
    免許: cert1.label,
    資格年1: cert2.date,
    資格1: cert2.label,
    資格年2: cert3.date,
    資格2: cert3.label,
    資格年3: cert4.date,
    資格3: cert4.label,
    資格年4: "",
    資格4: "",
    志望動機: valueOrBlank(profile?.motivation),
    自己紹介: valueOrBlank(profile?.selfIntroduction),
    来日目的: valueOrBlank(profile?.japanPurpose),
    現在の仕事: valueOrBlank(profile?.currentJob),
    退職理由: valueOrBlank(profile?.retirementReason),
    本人希望記入欄: valueOrBlank(profile?.preferenceNote),
  };
}

export function parseResumeLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date = "", label = "", result = ""] = line.split("|").map((part) => part.trim());
      return { date, label, result };
    });
}

export function stringifyResumeLines(lines: ResumeLine[] | null | undefined) {
  return (lines ?? [])
    .map((line) => [valueOrBlank(line.date), valueOrBlank(line.label), valueOrBlank(line.result)].join(" | "))
    .join("\n");
}
