import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const allowedStringFields = [
      "title",
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
      "status",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowedStringFields) {
      if (body[key] !== undefined) {
        data[key] = body[key] === null ? null : String(body[key]);
      }
    }
    const jobPosting = await prisma.jobPosting.update({
      where: { id: Number(id) },
      data,
    });
    return Response.json({ ok: true, jobPosting });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    await prisma.jobPosting.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
