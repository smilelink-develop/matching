import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireApiAccount();
    const { id } = await params;
    const { name, content } = await req.json();
    const existing = await prisma.messageTemplate.findFirst({
      where: { id: Number(id), accountId: account.id },
    });
    if (!existing) {
      return Response.json({ ok: false, error: "テンプレートが見つかりません" }, { status: 404 });
    }
    const template = await prisma.messageTemplate.update({
      where: { id: existing.id },
      data: { name, content },
    });
    return Response.json({ ok: true, template });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireApiAccount();
    const { id } = await params;
    await prisma.messageTemplate.deleteMany({ where: { id: Number(id), accountId: account.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
