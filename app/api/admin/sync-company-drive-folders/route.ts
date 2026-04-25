import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";
import { findFolderByPrefix } from "@/lib/google-docs";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 企業ルートフォルダ (1TEqGDtoQZlLU8bg8c4cWZSNDp7mRwbin) 配下のフォルダから、
 * Company.externalId で始まるフォルダを探して Company.driveFolderUrl に紐づける。
 *
 * - "02sv_…" のようなフォルダ名でも、"02sv__…" でも先頭一致でマッチ
 * - 既に driveFolderUrl が設定されている企業はスキップ (overwrite=1 で強制再リンク)
 */
const DEFAULT_COMPANY_ROOT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1TEqGDtoQZlLU8bg8c4cWZSNDp7mRwbin";

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);
    const overwrite = url.searchParams.get("overwrite") === "1";
    const rootFolderUrl =
      process.env.GOOGLE_COMPANY_FILES_FOLDER_URL?.trim() || DEFAULT_COMPANY_ROOT_FOLDER_URL;

    const companies = await prisma.company.findMany({
      where: overwrite
        ? { externalId: { not: null } }
        : { externalId: { not: null }, driveFolderUrl: null },
      select: { id: true, name: true, externalId: true, driveFolderUrl: true },
      orderBy: { id: "asc" },
    });

    const log: string[] = [];
    let matched = 0;
    let updated = 0;
    let skipped = 0;
    let error = 0;

    for (const company of companies) {
      try {
        const externalId = company.externalId!;
        // 02sv → "02sv" で始まるフォルダ (02sv_… / 02sv__… 等) を検索
        const found = await findFolderByPrefix({
          parentFolderUrl: rootFolderUrl,
          namePrefix: externalId,
        });
        if (!found) {
          log.push(`⚠️ ${externalId} ${company.name}: マッチするフォルダなし`);
          skipped++;
          continue;
        }
        matched++;
        if (company.driveFolderUrl === found.folderUrl) {
          log.push(`= ${externalId} ${company.name}: 既に同じ URL`);
          continue;
        }
        await prisma.company.update({
          where: { id: company.id },
          data: { driveFolderUrl: found.folderUrl },
        });
        log.push(`✅ ${externalId} ${company.name} → ${found.folderUrl}`);
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "error";
        log.push(`❌ ${company.externalId} ${company.name}: ${msg}`);
        error++;
      }
    }

    return Response.json({
      ok: true,
      summary: {
        total: companies.length,
        matched,
        updated,
        skipped,
        error,
      },
      log,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
