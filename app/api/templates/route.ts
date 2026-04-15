import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.messageTemplate.findMany({ orderBy: { name: "asc" } });
  return Response.json({ ok: true, templates });
}

export async function POST(req: Request) {
  try {
    const { name, content } = await req.json();
    const template = await prisma.messageTemplate.create({ data: { name, content } });
    return Response.json({ ok: true, template });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
