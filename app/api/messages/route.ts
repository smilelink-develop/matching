import { prisma } from "@/lib/prisma";
import { reconcileMessagePersonLinks } from "@/lib/message-linking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await reconcileMessagePersonLinks();
  const { searchParams } = new URL(req.url);

  if (searchParams.get("summary") === "true") {
    const unreadInboundCount = await prisma.message.count({
      where: {
        direction: "inbound",
        readAt: null,
        personId: { not: null },
      },
    });

    return Response.json({ ok: true, unreadInboundCount });
  }

  const messages = await prisma.message.findMany({
    orderBy: { sentAt: "asc" },
    take: 1000,
  });
  return Response.json({ ok: true, messages });
}

export async function PATCH(req: Request) {
  try {
    await reconcileMessagePersonLinks();
    const { personId } = await req.json();
    const normalizedPersonId = Number(personId);

    if (!Number.isInteger(normalizedPersonId) || normalizedPersonId <= 0) {
      return Response.json(
        { ok: false, error: "personId は正しい数値で指定してください" },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.message.updateMany({
      where: {
        personId: normalizedPersonId,
        direction: "inbound",
        readAt: null,
      },
      data: {
        readAt: now,
      },
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
