import { calculateAge } from "@/lib/candidate-profile";
import {
  RECOMMENDATION_COLUMN_OPTIONS,
  type RecommendationColumnKey,
} from "@/lib/recommendation-columns";

type CandidateInput = {
  stage: string;
  createdAt: Date;
  person: {
    id: number;
    name: string;
    nationality: string;
    residenceStatus: string;
    email: string | null;
    driveFolderUrl: string | null;
    onboarding: {
      englishName: string | null;
      birthDate: string | null;
      address: string | null;
      phoneNumber: string | null;
    } | null;
    resumeProfile: {
      gender: string | null;
      visaExpiryDate: string | null;
      visaType: string | null;
      traineeExperience: string | null;
      japaneseLevel: string | null;
      japaneseLevelDate: string | null;
      licenseName: string | null;
      preferenceNote: string | null;
    } | null;
    resumeDocuments?: { documentUrl: string | null }[];
    partner?: { name: string } | null;
  };
};

function calcYearsSince(startDate: string | null | undefined): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  const diffMs = Date.now() - start.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 0) return "";
  return years.toFixed(1);
}

export function getRecommendationColumnLabel(key: RecommendationColumnKey): string {
  return RECOMMENDATION_COLUMN_OPTIONS.find((c) => c.key === key)?.label ?? key;
}

export function buildRecommendationCellValue(
  candidate: CandidateInput,
  key: RecommendationColumnKey
): string {
  const p = candidate.person;
  const onb = p.onboarding;
  const resume = p.resumeProfile;
  const latestResume = p.resumeDocuments?.[0] ?? null;

  switch (key) {
    case "addedAt":
      return candidate.createdAt.toISOString().slice(0, 10);
    case "englishName":
      return onb?.englishName ?? "";
    case "name":
      return p.name;
    case "stage":
      return candidate.stage;
    case "gender":
      return resume?.gender ?? "";
    case "age":
      return calculateAge(onb?.birthDate ?? null) || "";
    case "nationality":
      return p.nationality;
    case "residenceStatus":
      return p.residenceStatus;
    case "address":
      return onb?.address ?? "";
    case "birthDate":
      return onb?.birthDate ?? "";
    case "visaExpiryDate":
      return resume?.visaExpiryDate ?? "";
    case "sswYears":
      return p.residenceStatus?.includes("特定技能")
        ? calcYearsSince(resume?.visaType ? resume?.visaExpiryDate : null) || ""
        : "";
    case "traineeExperience":
      return resume?.traineeExperience ?? "";
    case "japaneseLevel":
      return resume?.japaneseLevel ?? "";
    case "japaneseLevelDate":
      return resume?.japaneseLevelDate ?? "";
    case "licenseName":
      return resume?.licenseName ?? "";
    case "preferenceNote":
      return resume?.preferenceNote ?? "";
    case "phoneNumber":
      return onb?.phoneNumber ?? "";
    case "email":
      return p.email ?? "";
    case "partner":
      return p.partner?.name ?? "";
    case "resumeUrl":
      return latestResume?.documentUrl ?? "";
    case "driveFolderUrl":
      return p.driveFolderUrl ?? "";
    default:
      return "";
  }
}
