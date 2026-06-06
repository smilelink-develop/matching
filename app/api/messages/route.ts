import { prisma } from "@/lib/prisma";
import { reconcileMessagePersonLinks } from "@/lib/message-linking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await reconcileMessagePersonLinks();
  const { searchParams } = new URL(req.url);

  if (searchParams.get("summary") === "true") {
    // Partner / Person 両方の未読を合算
    const unreadInboundCount = await prisma.message.count({
      where: {
        direction: "inbound",
        readAt: null,
        OR: [{ personId: { not: null } }, { partnerId: { not: null } }],
      },
    });

    return Response.json({ ok: true, unreadInboundCount });
  }

  // 直近 1000 件 (desc で取得 → 古い順に並び替えて返す)
  const recent = await prisma.message.findMany({
    where: { partnerId: { not: null } }, // チャット画面はパートナー宛のみ
    orderBy: { sentAt: "desc" },
    take: 1000,
  });
  const messages = recent.reverse();
  return Response.json({ ok: true, messages });
}

export async function PATCH(req: Request) {
  try {
    await reconcileMessagePersonLinks();
    const body = await req.json();
    const personId = body?.personId !== undefined ? Number(body.personId) : null;
    const partnerId = body?.partnerId !== undefined ? Number(body.partnerId) : null;

    if (
      (!personId || !Number.isInteger(personId) || personId <= 0) &&
      (!partnerId || !Number.isInteger(partnerId) || partnerId <= 0)
    ) {
      return Response.json(
        { ok: false, error: "personId か partnerId のどちらかを指定してください" },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.message.updateMany({
      where: {
        ...(personId ? { personId } : {}),
        ...(partnerId ? { partnerId } : {}),
        direction: "inbound",
        readAt: null,
      },
      data: { readAt: now },
    });

    return Response.json({
      ok: true,
      updatedCount: result.count,
      readAt: now.toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
