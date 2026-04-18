import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, nationality, department, residenceStatus, groupId, message, scheduledAt } = body;
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return Response.json({ ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が未設定です" }, { status: 500 });

    // 対象者取得
    let targets: { id: number; name: string; lineUserId: string | null; messengerPsid: string | null }[] = [];

    if (mode === "group" && groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { include: { partner: true } } },
      });
      // パートナーには現状 LINE/Messenger ID を格納していないため、ID未登録として扱う
      targets = (group?.members ?? []).map((m) => ({
        id: m.partner.id,
        name: m.partner.name,
        lineUserId: null,
        messengerPsid: null,
      }));
    } else {
      const where: Record<string, unknown> = {};
      if (nationality) where.nationality = nationality;
      if (department) where.department = department;
      if (residenceStatus) where.residenceStatus = residenceStatus;
      const persons = await prisma.person.findMany({ where });
      targets = persons.map((p) => ({
        id: p.id, name: p.name, lineUserId: p.lineUserId, messengerPsid: p.messengerPsid,
      }));
    }

    if (scheduledAt) {
      await prisma.messageLog.create({
        data: {
          title: "予約配信",
          body: message,
          channel: "LINE/Messenger",
          targetFilter: JSON.stringify({ mode, nationality, department, residenceStatus, groupId }),
          status: "scheduled",
          matchedCount: targets.length,
          sentCount: 0,
          skippedCount: 0,
          scheduledAt: new Date(scheduledAt),
        },
      });
      return Response.json({ ok: true, targetCount: targets.length, scheduledAt });
    }

    // 即時送信
    let sentCount = 0;
    let failedCount = 0;
    const failures: { name: string; error: string }[] = [];

    for (const t of targets) {
      const to = t.lineUserId ?? t.messengerPsid;
      if (!to) { failedCount++; failures.push({ name: t.name, error: "ID未登録" }); continue; }

      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
      });

      if (res.ok) {
        sentCount++;
        await prisma.message.create({
          data: { personId: t.id, channel: "LINE", direction: "outbound", content: message, externalId: to },
        });
      } else {
        failedCount++;
        failures.push({ name: t.name, error: await res.text() });
      }
    }

    await prisma.messageLog.create({
      data: {
        title: "一斉配信",
        body: message,
        channel: "LINE",
        targetFilter: JSON.stringify({ mode, nationality, department, residenceStatus, groupId }),
        status: "done",
        matchedCount: targets.length,
        sentCount,
        skippedCount: 0,
        failedCount,
        failures: failures.length > 0 ? failures : undefined,
      },
    });

    return Response.json({ ok: true, sentCount, failedCount });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
