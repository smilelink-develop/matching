import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { createResumeDocumentFromTemplate, ensurePersonDriveFolder } from "@/lib/google-docs";

type JobPostingFields = {
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

const STRING_FIELDS: (keyof JobPostingFields)[] = [
  "jobDescription", "workLocation", "nearestStation", "headcount", "gender", "nationality",
  "workTime1Start", "workTime1End", "workTime2Start", "workTime2End",
  "overtime", "avgMonthlyOvertime", "fixedOvertimeHours", "fixedOvertimePay",
  "monthlyGross", "basicSalary", "salaryCalcMethod", "perfectAttendance",
  "housingAllowance", "nightShiftAllowance", "commuteAllowance",
  "socialInsurance", "employmentInsurance", "healthInsurance", "pensionInsurance",
  "incomeTax", "residentTax",
  "mealProvision", "mealAmount", "dormProvision", "dormAmount",
  "utilitiesProvision", "utilitiesAmount",
  "holidays", "otherBenefits", "notes",
];

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get("dealId");
    const jobPostings = await prisma.jobPosting.findMany({
      where: dealId ? { dealId: Number(dealId) } : undefined,
      include: {
        deal: { select: { title: true, company: { select: { name: true } } } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ ok: true, jobPostings });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireApiAccount();
    const body = await req.json();
    const dealId = Number(body?.dealId);
    if (!Number.isFinite(dealId)) {
      return Response.json({ ok: false, error: "dealId が必要です" }, { status: 400 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { company: true },
    });
    if (!deal) {
      return Response.json({ ok: false, error: "案件が見つかりません" }, { status: 404 });
    }

    const templateId = body?.templateId ? Number(body.templateId) : null;
    const title = clean(body?.title) ?? `${deal.company.name} ${deal.title} 求人票`;

    const fields: Record<string, string | null> = {};
    for (const key of STRING_FIELDS) {
      fields[key] = clean(body?.[key]);
    }

    let documentId: string | null = null;
    let documentUrl: string | null = null;
    let driveFolderUrl: string | null = null;

    // テンプレート指定ありかつ Drive 設定がある場合は Google Docs を複製
    if (templateId) {
      const template = await prisma.jobPostingTemplate.findUnique({ where: { id: templateId } });
      if (template) {
        try {
          // 案件用フォルダを確保 (会社名 + 案件タイトル)
          const folder = await ensurePersonDriveFolder({
            existingFolderUrl: null,
            personName: `${deal.company.name} ${deal.title}`,
            rootFolderUrl: template.driveFolderUrl,
          });
          driveFolderUrl = folder.folderUrl;

          // テンプレートの差し込み変数
          const replacements: Record<string, string> = {
            会社名: deal.company.name,
            案件名: deal.title,
            タイトル: title,
          };
          for (const key of STRING_FIELDS) {
            const value = fields[key];
            if (value) replacements[key] = value;
          }

          const generated = await createResumeDocumentFromTemplate({
            templateUrl: template.templateUrl,
            folderUrl: folder.folderUrl,
            title,
            replacements,
          });
          documentId = generated.documentId;
          documentUrl = generated.documentUrl;
        } catch (error) {
          // Drive 連携が未設定なら Docs 生成スキップし、フィールドのみ保存
          console.warn("JobPosting: skip Docs generation", error);
        }
      }
    }

    const jobPosting = await prisma.jobPosting.create({
      data: {
        dealId,
        templateId,
        title,
        documentId,
        documentUrl,
        driveFolderUrl,
        status: documentId ? "generated" : "draft",
        ...fields,
      },
      include: {
        deal: { select: { title: true, company: { select: { name: true } } } },
        template: { select: { name: true } },
      },
    });

    return Response.json({ ok: true, jobPosting });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
