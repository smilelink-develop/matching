import { prisma } from "@/lib/prisma";
import { DEFAULT_FIXED_QUESTIONS, normalizeFixedQuestions } from "@/lib/app-settings";

export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 1 },
  });

  return Response.json({
    ok: true,
    settings: {
      calendarEmbedUrl: settings?.calendarEmbedUrl ?? "",
      calendarLabel: settings?.calendarLabel ?? "",
      fixedQuestions: normalizeFixedQuestions(settings?.fixedQuestions),
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const nextCalendarEmbedUrl =
      typeof body.calendarEmbedUrl === "string" ? body.calendarEmbedUrl.trim() : undefined;
    const nextCalendarLabel =
      typeof body.calendarLabel === "string" ? body.calendarLabel.trim() : undefined;
    const nextFixedQuestions = body.fixedQuestions !== undefined
      ? normalizeFixedQuestions(body.fixedQuestions)
      : undefined;

    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        calendarEmbedUrl: nextCalendarEmbedUrl ?? null,
        calendarLabel: nextCalendarLabel ?? null,
        fixedQuestions: nextFixedQuestions ?? DEFAULT_FIXED_QUESTIONS,
      },
      update: {
        ...(nextCalendarEmbedUrl !== undefined ? { calendarEmbedUrl: nextCalendarEmbedUrl || null } : {}),
        ...(nextCalendarLabel !== undefined ? { calendarLabel: nextCalendarLabel || null } : {}),
        ...(nextFixedQuestions !== undefined ? { fixedQuestions: nextFixedQuestions } : {}),
      },
    });

    return Response.json({
      ok: true,
      settings: {
        calendarEmbedUrl: settings.calendarEmbedUrl ?? "",
        calendarLabel: settings.calendarLabel ?? "",
        fixedQuestions: normalizeFixedQuestions(settings.fixedQuestions),
      },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
