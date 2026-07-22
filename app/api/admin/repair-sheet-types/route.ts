/**
 * 過去の同期が文字列で書いてしまったセルを、シート本来の型 (数値 / 日付) に戻す。
 * 表示される値は変えず、型だけを揃える。
 *
 * GET /api/admin/repair-sheet-types          ← ドライラン (対象行と変更内容だけ返す)
 * GET /api/admin/repair-sheet-types?apply=1  ← 本実行
 * GET /api/admin/repair-sheet-types?sheet=名前
 *
 * 対象は「A 列 (ID) が文字列の数字になっている行」のみ。
 * 「IDなし」や「5月」等の区切り行は ID が数字でないため触らない。
 */

import { AuthError, requireApiAccount } from "@/lib/auth";
import {
  applySheetColumnFormats,
  parseSheetIdFromUrl,
  repairSheetCellTypes,
  SYNC_SHEET_TAB_NAME,
} from "@/lib/sheets-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const apply = searchParams.get("apply") === "1";
    const sheetName = searchParams.get("sheet") ?? SYNC_SHEET_TAB_NAME;

    const sheetUrl = process.env.SYNC_SHEET_URL?.trim();
    if (!sheetUrl) {
      return Response.json({ ok: false, error: "SYNC_SHEET_URL が未設定です" }, { status: 500 });
    }
    const spreadsheetId = parseSheetIdFromUrl(sheetUrl);
    if (!spreadsheetId) {
      return Response.json(
        { ok: false, error: `SYNC_SHEET_URL から Sheet ID を解析できません: ${sheetUrl}` },
        { status: 500 },
      );
    }

    // ?formats=1 … 値は触らず、列の表示形式だけを揃える
    // (追記行に 0000 や日付書式が付かず「271」「46225」と表示される問題の対策)
    if (searchParams.get("formats") === "1") {
      const formatResult = await applySheetColumnFormats({ spreadsheetId, sheetName, apply });
      return Response.json({ ok: true, mode: "formats", ...formatResult });
    }

    const result = await repairSheetCellTypes({ spreadsheetId, sheetName, apply });
    return Response.json({ ok: true, mode: "values", ...result });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 },
    );
  }
}
