import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const persons = await prisma.person.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json({ ok: true, persons });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const person = await prisma.person.create({
      data: {
        name: body.name,
        photoUrl: body.photoUrl || null,
        nationality: body.nationality,
        department: body.department || null,
        residenceStatus: body.residenceStatus,
        channel: body.channel,
        lineUserId: body.lineUserId || null,
        messengerPsid: body.messengerPsid || null,
        email: body.email || null,
        whatsappId: body.whatsappId || null,
      },
    });
    return Response.json({ ok: true, person });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
