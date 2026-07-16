/**
 * 候補者の Person.id を変更する PATCH エンドポイント。
 *
 * 事前準備: prisma/migrations/20260716120000_person_id_on_update_cascade で
 *   Person への全 FK に ON UPDATE CASCADE を追加済み。よって Person.id を UPDATE すれば
 *   子テーブルの personId も自動追従する。
 *
 * body: { newId: number }
 *
 * バリデーション:
 *   - newId は正の整数
 *   - newId は現在の id と異なる
 *   - newId は既存の別の候補者に使われていない (衝突チェック)
 *
 * 副作用:
 *   - Person_id_seq を新しい最大値まで進める (今後の autoincrement 衝突回避)
 */

import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const currentId = Number(id);
    if (!Number.isFinite(currentId) || currentId <= 0) {
      return Response.json({ ok: false, error: "現在の ID が不正です" }, { status: 400 });
    }

    const body = await req.json();
    const rawNewId = body.newId;
    const newId = typeof rawNewId === "number" ? rawNewId : Number(rawNewId);
    if (!Number.isFinite(newId) || newId <= 0 || !Number.isInteger(newId)) {
      return Response.json({ ok: false, error: "新しい ID は正の整数を指定してください" }, { status: 400 });
    }
    if (newId === currentId) {
      return Response.json({ ok: false, error: "現在と同じ ID です" }, { status: 400 });
    }

    const [current, collision] = await Promise.all([
      prisma.person.findUnique({ where: { id: currentId }, select: { id: true } }),
      prisma.person.findUnique({ where: { id: newId }, select: { id: true, name: true } }),
    ]);
    if (!current) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }
    if (collision) {
      return Response.json(
        {
          ok: false,
          error: `ID ${newId} は既に別の候補者 (${collision.name}) が使用中です`,
        },
        { status: 409 },
      );
    }

    // Person.id を UPDATE (子 FK は ON UPDATE CASCADE で自動追従)
    const updated = await prisma.person.update({
      where: { id: currentId },
      data: { id: newId },
      select: { id: true, name: true },
    });

    // 次回 autoincrement が衝突しないよう、シーケンスを最大値まで進める
    // (setval の引数は正確なテーブル名依存: Postgres の Prisma 標準は "Person_id_seq")
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Person"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Person"))`,
    );

    return Response.json({ ok: true, person: updated });
  } catch (error) {
    console.error("[personnel/change-id] error:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 },
    );
  }
}
