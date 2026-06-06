/**
 * パートナーの担当者 更新 / 削除
 *   PATCH  /api/partners/{id}/contacts/{contactId}  { name?, title?, email?, phone?, notes?, sortOrder? }
 *   DELETE /api/partners/{id}/contacts/{contactId}
 */
import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireApiAccount();
    const { contactId } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.title !== undefined) data.title = body.title ? String(body.title).trim() : null;
    if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    const contact = await prisma.partnerContact.update({
      where: { id: Number(contactId) },
      data,
    });
    return Response.json({ ok: true, contact });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    await requireApiAccount();
    const { contactId } = await params;
    await prisma.partnerContact.delete({ where: { id: Number(contactId) } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
