import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const deal = await prisma.deal.findUnique({
      where: { id: Number(id) },
      include: {
        company: true,
        partner: true,
        owner: { select: { id: true, name: true } },
        candidates: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                nationality: true,
                residenceStatus: true,
                channel: true,
                photoUrl: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!deal) {
      return Response.json({ ok: false, error: "案件が見つかりません" }, { status: 404 });
    }

    return Response.json({ ok: true, deal });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const updateData: {
      status?: string;
      priority?: string;
      ownerId?: number | null;
      unitPrice?: string | null;
      deadline?: Date | null;
      notes?: string | null;
    } = {};

    if (body.status !== undefined) updateData.status = String(body.status);
    if (body.priority !== undefined) updateData.priority = String(body.priority);
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId ? Number(body.ownerId) : null;
    if (body.unitPrice !== undefined) updateData.unitPrice = String(body.unitPrice ?? "").trim() || null;
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(String(body.deadline)) : null;
    if (body.notes !== undefined) updateData.notes = String(body.notes ?? "").trim() || null;

    const deal = await prisma.deal.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return Response.json({ ok: true, deal });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
