import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, string> = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.templateUrl !== undefined) data.templateUrl = String(body.templateUrl);
    if (body.driveFolderUrl !== undefined) data.driveFolderUrl = String(body.driveFolderUrl);
    const template = await prisma.jobPostingTemplate.update({ where: { id: Number(id) }, data });
    return Response.json({ ok: true, template });
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
    await prisma.jobPostingTemplate.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
