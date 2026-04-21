import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return Response.json({ ok: false, error: "パートナー名を入力してください" }, { status: 400 });
    }

    const partner = await prisma.partner.update({
      where: { id: Number(id) },
      data: {
        name,
        country: String(body.country ?? "").trim() || null,
        channel: String(body.channel ?? "").trim() || null,
        linkStatus: String(body.linkStatus ?? "未").trim() || "未",
        contactName: String(body.contactName ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    return Response.json({ ok: true, partner });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    await prisma.partner.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
