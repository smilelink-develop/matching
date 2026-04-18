import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const company = await prisma.company.findUnique({
      where: { id: Number(id) },
      include: {
        deals: {
          include: {
            owner: { select: { name: true } },
            candidates: { select: { id: true } },
          },
          orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        },
      },
    });

    if (!company) {
      return Response.json({ ok: false, error: "企業が見つかりません" }, { status: 404 });
    }

    return Response.json({ ok: true, company });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
