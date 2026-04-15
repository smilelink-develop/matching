import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { personId, message } = await req.json();
    if (!personId || !message?.trim()) {
      return Response.json({ ok: false, error: "personId と message は必須です" }, { status: 400 });
    }

    const person = await prisma.person.findUnique({ where: { id: Number(personId) } });
    if (!person) return Response.json({ ok: false, error: "人材が見つかりません" }, { status: 404 });

    const to = person.lineUserId ?? person.messengerPsid;
    if (!to) return Response.json({ ok: false, error: "この人材には連絡先IDが登録されていません" }, { status: 400 });

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return Response.json({ ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN が未設定です" }, { status: 500 });

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
    });

    const resultText = await res.text();
    if (!res.ok) {
      return Response.json({ ok: false, error: "LINE送信に失敗しました", lineBody: resultText }, { status: 500 });
    }

    await prisma.message.create({
      data: { personId: person.id, channel: person.channel, direction: "outbound", content: message, externalId: to },
    });

    return Response.json({ ok: true, person: { id: person.id, name: person.name }, lineUserId: to });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
