import { prisma } from "@/lib/prisma";

/**
 * 候補者向け公開フォーム API。認証不要。
 *   GET  /api/intake/{token}  ... 候補者名 + 既存回答を返す
 *   PUT  /api/intake/{token}  ... 回答を保存
 */

export const runtime = "nodejs";

type ResumeProfileLike = {
  motivation: string | null;
  selfIntroduction: string | null;
  japanPurpose: string | null;
  currentJob: string | null;
  retirementReason: string | null;
  interviewAnswers: unknown;
};

function pickAnswers(profile: ResumeProfileLike | null) {
  return {
    motivation: profile?.motivation ?? "",
    selfIntroduction: profile?.selfIntroduction ?? "",
    japanPurpose: profile?.japanPurpose ?? "",
    currentJob: profile?.currentJob ?? "",
    retirementReason: profile?.retirementReason ?? "",
    interviewAnswers:
      profile?.interviewAnswers && typeof profile.interviewAnswers === "object"
        ? (profile.interviewAnswers as Record<string, unknown>)
        : {},
  };
}

export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return Response.json({ ok: false, error: "無効なリンクです" }, { status: 400 });
  }
  const person = await prisma.person.findUnique({
    where: { intakeToken: token },
    select: {
      id: true,
      name: true,
      onboarding: { select: { englishName: true } },
      resumeProfile: {
        select: {
          motivation: true,
          selfIntroduction: true,
          japanPurpose: true,
          currentJob: true,
          retirementReason: true,
          interviewAnswers: true,
        },
      },
    },
  });
  if (!person) {
    return Response.json({ ok: false, error: "リンクが無効です" }, { status: 404 });
  }
  return Response.json({
    ok: true,
    person: {
      name: person.name,
      englishName: person.onboarding?.englishName ?? null,
    },
    answers: pickAnswers(person.resumeProfile),
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 8) {
      return Response.json({ ok: false, error: "無効なリンクです" }, { status: 400 });
    }
    const person = await prisma.person.findUnique({
      where: { intakeToken: token },
      select: { id: true, resumeProfile: { select: { id: true } } },
    });
    if (!person) {
      return Response.json({ ok: false, error: "リンクが無効です" }, { status: 404 });
    }

    const body = await req.json();
    const cleanStr = (v: unknown) =>
      typeof v === "string" ? v.trim() || null : null;

    // 既存履歴書カラム
    const dataExisting = {
      motivation: cleanStr(body?.motivation),
      selfIntroduction: cleanStr(body?.selfIntroduction),
      japanPurpose: cleanStr(body?.japanPurpose),
      currentJob: cleanStr(body?.currentJob),
      retirementReason: cleanStr(body?.retirementReason),
    };

    // interviewAnswers JSON
    const incomingAnswers =
      body?.interviewAnswers && typeof body.interviewAnswers === "object"
        ? Object.fromEntries(
            Object.entries(body.interviewAnswers as Record<string, unknown>)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([k, v]) => [k, typeof v === "string" ? v : String(v)])
          )
        : {};

    // resumeProfile を upsert (無ければ作る)
    if (person.resumeProfile) {
      await prisma.resumeProfile.update({
        where: { personId: person.id },
        data: { ...dataExisting, interviewAnswers: incomingAnswers },
      });
    } else {
      await prisma.resumeProfile.create({
        data: {
          personId: person.id,
          ...dataExisting,
          interviewAnswers: incomingAnswers,
        },
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: 500 }
    );
  }
}
