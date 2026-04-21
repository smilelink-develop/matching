import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function POST(_: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const personId = Number(id);

    const activeQuestions = await prisma.personCustomQuestion.count({
      where: { personId, active: true },
    });

    if (activeQuestions === 0) {
      return Response.json({ ok: false, error: "送信できる個別質問がありません" }, { status: 400 });
    }

    // 同じタイプのペンディング タスクが既にあれば再利用。無ければ新規作成。
    const existing = await prisma.portalTask.findFirst({
      where: { personId, type: "custom-questions", status: "pending" },
    });

    const href = `/portal/${personId}/custom-questions`;
    if (existing) {
      const updated = await prisma.portalTask.update({
        where: { id: existing.id },
        data: {
          title: "個別質問への回答",
          description: `${activeQuestions} 件の質問があります。タップして回答してください。`,
          href,
        },
      });
      return Response.json({ ok: true, task: updated });
    }

    const task = await prisma.portalTask.create({
      data: {
        personId,
        type: "custom-questions",
        title: "個別質問への回答",
        description: `${activeQuestions} 件の質問があります。タップして回答してください。`,
        href,
      },
    });

    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
