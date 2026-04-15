import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET() {
  try {
    const account = await requireApiAccount();
    const templates = await prisma.messageTemplate.findMany({
      where: { accountId: account.id },
      orderBy: { name: "asc" },
    });
    return Response.json({ ok: true, templates });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const account = await requireApiAccount();
    const { name, content } = await req.json();
    const template = await prisma.messageTemplate.create({
      data: { accountId: account.id, name, content },
    });
    return Response.json({ ok: true, template });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
