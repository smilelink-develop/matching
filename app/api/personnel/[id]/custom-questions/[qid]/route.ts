import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type RouteParams = Promise<{ id: string; qid: string }>;

export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  try {
    await requireApiAccount();
    const { qid } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.label !== undefined) data.label = String(body.label);
    if (body.type !== undefined) data.type = body.type === "file" ? "file" : "text";
    if (body.required !== undefined) data.required = Boolean(body.required);
    if (body.answer !== undefined) data.answer = body.answer === null ? null : String(body.answer);
    if (body.fileName !== undefined) data.fileName = body.fileName === null ? null : String(body.fileName);
    if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl === null ? null : String(body.fileUrl);
    if (body.mimeType !== undefined) data.mimeType = body.mimeType === null ? null : String(body.mimeType);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

    const question = await prisma.personCustomQuestion.update({
      where: { id: Number(qid) },
      data,
    });
    return Response.json({ ok: true, question });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: RouteParams }) {
  try {
    await requireApiAccount();
    const { qid } = await params;
    // 物理削除せず active=false + answer=null にして、個別ページに空欄として残す
    const question = await prisma.personCustomQuestion.update({
      where: { id: Number(qid) },
      data: { active: false, answer: null },
    });
    return Response.json({ ok: true, question });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
