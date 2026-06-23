/**
 * 既存候補者の ResumeProfile.resumeFileUrl と Person.photoUrl を
 * Drive 上の履歴書ファイルから一括埋める admin 用エンドポイント。
 * Railway 上で 1 回呼ぶ想定。
 *
 * GET /api/admin/backfill-resume-file-urls?apply=1  ← 実行
 * GET /api/admin/backfill-resume-file-urls          ← DRY RUN
 *
 * 対象: driveFolderUrl 有り + (resumeFileUrl 空 OR photoUrl 空)
 * 動作:
 *   - 候補者の Drive フォルダ内ファイルを全件 list
 *   - 名前に "履歴書/resume/cv" を含むファイルを優先、無ければフォルダ内
 *     最初の非フォルダファイル
 *   - resumeFileUrl 空ならファイル URL を設定
 *   - photoUrl 空ならサムネ URL を設定 (PDF はページ1、画像はそのまま)
 */

import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { parseGoogleDriveFolderId } from "@/lib/google-docs";
import { toDriveThumbUrl } from "@/lib/drive-url";
import { google } from "googleapis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const apply = searchParams.get("apply") === "1";

    // 対象: driveFolderUrl 有り + (photoUrl 空 OR resumeFileUrl 空)
    const candidates = await prisma.person.findMany({
      where: {
        driveFolderUrl: { not: null },
        OR: [
          { photoUrl: null },
          { resumeProfile: { resumeFileUrl: null } },
          { resumeProfile: null },
        ],
      },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        driveFolderUrl: true,
        resumeProfile: { select: { id: true, resumeFileUrl: true } },
      },
      orderBy: { id: "asc" },
    });

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    await auth.authorize();
    const drive = google.drive({ version: "v3", auth });

    const log: string[] = [];
    let processed = 0;
    let updatedPhoto = 0;
    let updatedResume = 0;
    let notFound = 0;
    let errored = 0;

    for (const p of candidates) {
      processed++;
      const folderId = parseGoogleDriveFolderId(p.driveFolderUrl ?? "");
      if (!folderId) {
        log.push(`⏭  ID=${p.id} ${p.name}: フォルダ ID 解決不能`);
        errored++;
        continue;
      }
      try {
        // フォルダ内の全ファイル取得 (非フォルダのみ、作成日時降順)
        const list = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
          fields: "files(id,name,webViewLink,createdTime)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          orderBy: "createdTime desc",
          pageSize: 50,
        });
        const files = list.data.files ?? [];
        if (files.length === 0) {
          log.push(`🔍 ID=${p.id} ${p.name}: フォルダ内にファイル無し`);
          notFound++;
          continue;
        }
        // 優先: 名前に "履歴書/resume/cv" を含むもの → なければ最初の非フォルダ
        const resumeFile =
          files.find((f) => typeof f.name === "string" && /履歴書|resume|cv/i.test(f.name)) ?? files[0];
        if (!resumeFile?.id) {
          log.push(`🔍 ID=${p.id} ${p.name}: 履歴書候補なし`);
          notFound++;
          continue;
        }
        const url = resumeFile.webViewLink ?? `https://drive.google.com/file/d/${resumeFile.id}/view`;
        const thumb = toDriveThumbUrl(url);

        const willUpdatePhoto = !p.photoUrl && thumb;
        const willUpdateResume = !p.resumeProfile?.resumeFileUrl;

        if (!willUpdatePhoto && !willUpdateResume) {
          // 既に両方埋まってる (where 句から漏れたケース) はスキップ
          continue;
        }

        if (apply) {
          if (willUpdatePhoto && thumb) {
            await prisma.person.update({
              where: { id: p.id },
              data: { photoUrl: thumb },
            });
            updatedPhoto++;
          }
          if (willUpdateResume) {
            if (p.resumeProfile) {
              await prisma.resumeProfile.update({
                where: { id: p.resumeProfile.id },
                data: { resumeFileUrl: url },
              });
            } else {
              await prisma.resumeProfile.create({
                data: { personId: p.id, resumeFileUrl: url },
              });
            }
            updatedResume++;
          }
          log.push(
            `✅ ID=${p.id} ${p.name} ← ${resumeFile.name}` +
              (willUpdatePhoto ? " [photo]" : "") +
              (willUpdateResume ? " [resume]" : "")
          );
        } else {
          log.push(
            `[DRY] ID=${p.id} ${p.name} ← ${resumeFile.name}` +
              (willUpdatePhoto ? " [photo]" : "") +
              (willUpdateResume ? " [resume]" : "")
          );
          if (willUpdatePhoto) updatedPhoto++;
          if (willUpdateResume) updatedResume++;
        }
      } catch (e) {
        log.push(`❌ ID=${p.id} ${p.name}: ${e instanceof Error ? e.message : "error"}`);
        errored++;
      }
    }

    return Response.json({
      ok: true,
      apply,
      totals: {
        processed,
        candidatesFound: candidates.length,
        [apply ? "photoUpdated" : "photoWillUpdate"]: updatedPhoto,
        [apply ? "resumeUpdated" : "resumeWillUpdate"]: updatedResume,
        notFound,
        errored,
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
