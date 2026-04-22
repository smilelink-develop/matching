import { prisma } from "@/lib/prisma";
import { requireApiAccount, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireApiAccount();
    const companies = await prisma.company.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
    return Response.json({ ok: true, companies });
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
    const name = String(body.name ?? "").trim();

    if (!name) {
      return Response.json({ ok: false, error: "企業名を入力してください" }, { status: 400 });
    }

    const externalId = String(body.externalId ?? "").trim() || null;
    if (externalId) {
      const duplicate = await prisma.company.findUnique({ where: { externalId } });
      if (duplicate) {
        return Response.json({ ok: false, error: `企業ID "${externalId}" は既に使われています` }, { status: 409 });
      }
    }
    const company = await prisma.company.create({
      data: {
        externalId,
        name,
        industry: String(body.industry ?? "").trim() || null,
        location: String(body.location ?? "").trim() || null,
        hiringStatus: String(body.hiringStatus ?? "").trim() || "募集中",
        driveFolderUrl: String(body.driveFolderUrl ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    return Response.json({ ok: true, company });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
