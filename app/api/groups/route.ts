import { prisma } from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.group.findMany({
    include: { members: { include: { partner: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json({ ok: true, groups });
}

export async function POST(req: Request) {
  try {
    const { name, personIds } = await req.json();
    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: (personIds ?? []).map((id: number) => ({ partnerId: id })),
        },
      },
      include: { members: { include: { partner: true } } },
    });
    return Response.json({
      ok: true,
      group: {
        id: group.id, name: group.name,
        members: group.members.map((m) => ({ id: m.partner.id, name: m.partner.name })),
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
