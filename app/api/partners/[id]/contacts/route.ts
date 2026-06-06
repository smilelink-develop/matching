/**
 * パートナー会社の担当者一覧取得 / 新規作成
 *   GET  /api/partners/{id}/contacts
 *   POST /api/partners/{id}/contacts  { name, title?, email?, phone?, notes? }
 */
import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const contacts = await prisma.partnerContact.findMany({
      where: { partnerId: Number(id) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return Response.json({ ok: true, contacts });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ ok: false, error: "担当者名は必須です" }, { status: 400 });
    }
    const contact = await prisma.partnerContact.create({
      data: {
        partnerId: Number(id),
        name: body.name.trim(),
        title: body.title?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        notes: body.notes?.trim() || null,
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
      },
    });
    return Response.json({ ok: true, contact });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
