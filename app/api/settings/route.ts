import { prisma } from "@/lib/prisma";
import {
  DEFAULT_FIXED_QUESTIONS,
  normalizeFixedQuestions,
} from "@/lib/app-settings";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET() {
  try {
    const account = await requireApiAccount();
    const [accountSettings, coreSettings] = await Promise.all([
      prisma.appSettings.findUnique({
        where: { accountId: account.id },
      }),
      prisma.coreSettings.findUnique({
        where: { id: 1 },
      }),
    ]);

    return Response.json({
      ok: true,
      settings: {
        calendarEmbedUrl: accountSettings?.calendarEmbedUrl ?? "",
        calendarLabel: accountSettings?.calendarLabel ?? "",
        fixedQuestions: normalizeFixedQuestions(coreSettings?.fixedQuestions),
      },
      currentAccount: account,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const account = await requireApiAccount();
    const body = await req.json();
    const nextCalendarEmbedUrl =
      typeof body.calendarEmbedUrl === "string" ? body.calendarEmbedUrl.trim() : undefined;
    const nextCalendarLabel =
      typeof body.calendarLabel === "string" ? body.calendarLabel.trim() : undefined;
    const nextFixedQuestions =
      body.fixedQuestions !== undefined ? normalizeFixedQuestions(body.fixedQuestions) : undefined;

    const accountSettings = await prisma.appSettings.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        calendarEmbedUrl: nextCalendarEmbedUrl ?? null,
        calendarLabel: nextCalendarLabel ?? null,
      },
      update: {
        ...(nextCalendarEmbedUrl !== undefined
          ? { calendarEmbedUrl: nextCalendarEmbedUrl || null }
          : {}),
        ...(nextCalendarLabel !== undefined ? { calendarLabel: nextCalendarLabel || null } : {}),
      },
    });

    if (nextFixedQuestions !== undefined && account.role === "admin") {
      await prisma.coreSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          fixedQuestions: nextFixedQuestions ?? DEFAULT_FIXED_QUESTIONS,
        },
        update: {
          fixedQuestions: nextFixedQuestions,
        },
      });
    }

    const coreSettings = await prisma.coreSettings.findUnique({
      where: { id: 1 },
    });

    return Response.json({
      ok: true,
      settings: {
        calendarEmbedUrl: accountSettings.calendarEmbedUrl ?? "",
        calendarLabel: accountSettings.calendarLabel ?? "",
        fixedQuestions: normalizeFixedQuestions(coreSettings?.fixedQuestions),
      },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
