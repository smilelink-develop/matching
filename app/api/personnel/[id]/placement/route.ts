import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type Params = Promise<{ id: string }>;

const DATE_FIELDS = [
  "acceptedAt",
  "preInterviewAt",
  "companyInterviewAt",
  "offerAt",
  "offerAcceptedAt",
  "applicationPlannedAt",
  "applicationAt",
  "applicationResultAt",
  "returnHomeAt",
  "entryPlannedAt",
  "entryAt",
  "joinPlannedAt",
  "joinAt",
] as const;

const TEXT_FIELDS = [
  "stage",
  "applicationType",
  "applicantName",
  "returnHomeFlag",
  "sixMonthStatus",
  "consultation",
  "currentAction",
] as const;

export async function GET(_: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const placement = await prisma.personPlacement.findUnique({ where: { personId: Number(id) } });
    return Response.json({ ok: true, placement });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const personId = Number(id);
    const body = await req.json();

    const createData: Record<string, unknown> = { personId };
    const updateData: Record<string, unknown> = {};
    for (const field of DATE_FIELDS) {
      if (body[field] !== undefined) {
        const value = body[field] ? new Date(String(body[field])) : null;
        createData[field] = value;
        updateData[field] = value;
      }
    }
    for (const field of TEXT_FIELDS) {
      if (body[field] !== undefined) {
        const value = body[field] ? String(body[field]) : null;
        createData[field] = value;
        updateData[field] = value;
      }
    }

    const placement = await prisma.personPlacement.upsert({
      where: { personId },
      create: createData as never,
      update: updateData as never,
    });

    return Response.json({ ok: true, placement });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
