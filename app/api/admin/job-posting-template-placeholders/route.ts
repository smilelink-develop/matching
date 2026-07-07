/**
 * 求人票テンプレート Docs から {{...}} placeholder を抽出して返す admin エンドポイント。
 *
 *   GET /api/admin/job-posting-template-placeholders?templateId=1
 *
 * 条件タブとの対照 (どれが未マッピング、逆にコード側にあってテンプレに無い) も返す。
 */

import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { google } from "googleapis";
import { parseGoogleDocId } from "@/lib/google-docs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 求人票 POST route と同じ列挙 (壊れないよう二重管理は避けたいが、まず把握のため)
const CODE_SIDE_PLACEHOLDERS = [
  "会社名",
  "案件名",
  "タイトル",
  "求人名",
  "案件ID",
  "作成日",
  "分野",
  "雇用形態",
  "ビザ種類",
  "雇用期間",
  "勤務時間1",
  "勤務時間2",
  "勤務時間3",
  "勤務時間1休憩分",
  "勤務時間2休憩分",
  "勤務時間3休憩分",
  "仕事内容",
  "勤務地",
  "最寄り駅",
  "最寄駅",
  "募集人数",
  "性別",
  "国籍",
  "勤務時間1開始",
  "勤務時間1終了",
  "勤務時間2開始",
  "勤務時間2終了",
  "残業有無",
  "残業",
  "月間平均残業時間",
  "固定残業時間",
  "固定残業代",
  "月総支給額",
  "基本給",
  "給与計算方法",
  "皆勤手当",
  "住宅手当",
  "深夜手当",
  "通勤手当",
  "社会保険料",
  "雇用保険料",
  "健康保険料",
  "厚生年金保険料",
  "所得税",
  "住民税",
  "食費支給有無",
  "食費支給",
  "食費金額",
  "寮費有無",
  "寮有無",
  "寮費金額",
  "寮費",
  "光熱費有無",
  "光熱費金額",
  "休日詳細",
  "休日",
  "福利厚生",
  "その他手当",
  "特記事項",
  "備考",
  // 2026-06 拡張
  "企業ID",
  "企業D",
  "昇給有無",
  "賞与有無",
  "給与支払日",
  "給与締日",
  "月控除額",
  "その他控除金額",
  "Wifi代金額",
  "水道代金額",
  "引越補助有無",
  "引越補助詳細",
  "寮人数",
  "寝室共有",
  "寮から通勤時間",
  "食事提供有無",
  "外国人就業者",
  "海外応募可否",
  "日本語レベル",
  "経験年数",
  "必要資格",
  "通勤手段",
  "面接希望日",
  "選考フロー",
  "入国希望日",
  "試用期間有無",
  "試用期間詳細",
  "設備",
  "休日休暇区分",
  "社会保険",
];

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const templateIdParam = searchParams.get("templateId");

    let templateUrl: string;
    if (templateIdParam) {
      const t = await prisma.jobPostingTemplate.findUnique({
        where: { id: Number(templateIdParam) },
      });
      if (!t) return Response.json({ ok: false, error: "template not found" }, { status: 404 });
      templateUrl = t.templateUrl;
    } else {
      // 最初のテンプレートを対象に
      const t = await prisma.jobPostingTemplate.findFirst();
      if (!t) return Response.json({ ok: false, error: "no template" }, { status: 404 });
      templateUrl = t.templateUrl;
    }

    const documentId = parseGoogleDocId(templateUrl);
    if (!documentId) return Response.json({ ok: false, error: "invalid template URL" }, { status: 400 });

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    await auth.authorize();
    const docs = google.docs({ version: "v1", auth });

    const doc = await docs.documents.get({ documentId });
    let allText = "";
    const walk = (element: unknown) => {
      if (!element || typeof element !== "object") return;
      const e = element as Record<string, unknown>;
      if (typeof e.content === "string") allText += e.content;
      for (const [key, value] of Object.entries(e)) {
        if (key === "content" && typeof value === "string") continue;
        if (Array.isArray(value)) value.forEach((v) => walk(v));
        else if (value && typeof value === "object") walk(value);
      }
    };
    walk(doc.data.body);
    walk(doc.data.headers);
    walk(doc.data.footers);

    const placeholders = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(allText)) !== null) {
      placeholders.add(match[1].trim());
    }
    const templatePlaceholders = Array.from(placeholders).sort();

    // 対照:
    const codeSideSet = new Set(CODE_SIDE_PLACEHOLDERS);
    const missingInCode = templatePlaceholders.filter((p) => !codeSideSet.has(p));
    const missingInTemplate = CODE_SIDE_PLACEHOLDERS.filter((p) => !placeholders.has(p));

    return Response.json({
      ok: true,
      templateUrl,
      templatePlaceholders,
      missingInCode, // テンプレにあるがコード側から送っていない → 空白のまま
      missingInTemplate, // コード側は送るがテンプレに無い → 影響なし
      totalInTemplate: templatePlaceholders.length,
      totalInCode: CODE_SIDE_PLACEHOLDERS.length,
    });
  } catch (error) {
    console.error("template-placeholders error:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
