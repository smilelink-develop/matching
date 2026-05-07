/**
 * 解析した ParsedJobSheet を、既存 /api/job-postings POST の body 形式
 * (= JobPostingFields) に変換する。
 *
 * 既存ルートが受け付けるキー (英語) を埋めれば、自動的に Docs テンプレの
 * {{勤務地}} 等の日本語 placeholder へ JP_KEY_MAP 経由で展開される。
 */

import type { ParsedJobSheet } from "@/lib/job-sheet/types";

export type JobPostingFieldsBody = {
  // 既存 /api/job-postings POST が読むキー
  title?: string;
  jobDescription?: string;
  workLocation?: string;
  nearestStation?: string;
  headcount?: string;
  gender?: string;
  nationality?: string;
  workTime1Start?: string;
  workTime1End?: string;
  workTime2Start?: string;
  workTime2End?: string;
  overtime?: string;
  avgMonthlyOvertime?: string;
  fixedOvertimeHours?: string;
  fixedOvertimePay?: string;
  monthlyGross?: string;
  basicSalary?: string;
  salaryCalcMethod?: string;
  perfectAttendance?: string;
  housingAllowance?: string;
  nightShiftAllowance?: string;
  commuteAllowance?: string;
  socialInsurance?: string;
  employmentInsurance?: string;
  healthInsurance?: string;
  pensionInsurance?: string;
  incomeTax?: string;
  residentTax?: string;
  mealProvision?: string;
  mealAmount?: string;
  dormProvision?: string;
  dormAmount?: string;
  utilitiesProvision?: string;
  utilitiesAmount?: string;
  holidays?: string;
  otherBenefits?: string;
  notes?: string;
};

const numStr = (n: number | null | undefined): string | undefined =>
  typeof n === "number" && Number.isFinite(n) ? String(n) : undefined;

const boolStr = (b: boolean | null | undefined): string | undefined =>
  b === true ? "有" : b === false ? "無" : undefined;

/** 勤務時間 "09:00〜18:00" → { start: "09:00", end: "18:00" } */
function splitShift(timeRange: string): { start: string; end: string } {
  if (!timeRange) return { start: "", end: "" };
  const m = timeRange.match(/(\d{1,2}:\d{2})\s*[~〜~ーー\-―]\s*(\d{1,2}:\d{2})/);
  if (!m) return { start: timeRange, end: "" };
  return { start: m[1], end: m[2] };
}

/** 配列 allowances から特定の手当の金額を取り出す */
function findAllowanceAmount(
  allowances: ParsedJobSheet["salary"]["allowances"],
  needles: string[]
): number | null {
  for (const allowance of allowances) {
    const name = allowance.name ?? "";
    if (needles.some((kw) => name.includes(kw))) {
      return typeof allowance.amount === "number" ? allowance.amount : null;
    }
  }
  return null;
}

export function toJobPostingBody(p: ParsedJobSheet): JobPostingFieldsBody {
  const shift1 = p.workingHours.shifts[0]?.timeRange ?? "";
  const shift2 = p.workingHours.shifts[1]?.timeRange ?? "";
  const sp1 = splitShift(shift1);
  const sp2 = splitShift(shift2);

  const housingAllowanceAmount = findAllowanceAmount(p.salary.allowances, ["住宅", "住居"]);
  const perfectAttendanceAmount = findAllowanceAmount(p.salary.allowances, ["皆勤"]);
  const nightShiftAmount = findAllowanceAmount(p.salary.allowances, ["深夜"]);
  const commuteAmount = findAllowanceAmount(p.salary.allowances, ["通勤", "交通"]);
  const fixedOvertimePayAmount = findAllowanceAmount(p.salary.allowances, ["固定残業", "みなし残業"]);

  return {
    title: p.job.acceptanceOccupation || p.jobCategory || undefined,
    jobDescription: p.job.jobDescription || undefined,
    workLocation: p.job.workLocation || p.employment.workplace || undefined,
    nearestStation: p.employment.nearestStation || undefined,
    headcount: p.job.recruitmentCount || undefined,
    gender: p.job.genderRequirement || undefined,
    nationality: p.job.nationalityRequirement || undefined,
    workTime1Start: sp1.start || undefined,
    workTime1End: sp1.end || undefined,
    workTime2Start: sp2.start || undefined,
    workTime2End: sp2.end || undefined,
    overtime: boolStr(p.workingHours.overtimeAvailable),
    avgMonthlyOvertime: numStr(p.workingHours.averageMonthlyOvertimeHours),
    fixedOvertimeHours: numStr(p.workingHours.fixedOvertimeHours),
    fixedOvertimePay: numStr(fixedOvertimePayAmount),
    monthlyGross: numStr(p.salary.monthlyGross),
    basicSalary: numStr(p.salary.baseSalary),
    salaryCalcMethod: p.salary.salaryCalculationMethod || undefined,
    perfectAttendance: numStr(perfectAttendanceAmount),
    housingAllowance: numStr(housingAllowanceAmount),
    nightShiftAllowance: numStr(nightShiftAmount),
    commuteAllowance: numStr(commuteAmount),
    socialInsurance: p.benefits.socialInsurance || undefined,
    employmentInsurance: numStr(p.deductions.employmentInsurance),
    healthInsurance: numStr(p.deductions.healthInsurance),
    pensionInsurance: numStr(p.deductions.pension),
    incomeTax: numStr(p.deductions.incomeTax),
    residentTax: numStr(p.deductions.residentTax),
    mealProvision: p.benefits.mealSupport || undefined,
    mealAmount: numStr(p.deductions.foodCost),
    dormProvision: boolStr(p.housing.dormitoryAvailable),
    dormAmount: numStr(p.housing.dormitoryCost),
    utilitiesAmount: numStr(p.deductions.utilities),
    holidays: p.benefits.holidays || undefined,
    otherBenefits: p.benefits.otherWelfare || undefined,
    notes: p.misc.specialNotes || undefined,
  };
}
