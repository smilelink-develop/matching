import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";
import { google } from "googleapis";
import { parseGoogleDriveFolderId } from "@/lib/google-docs";

/**
 * 候補者ルートフォルダ (1Pmv-hFy...) 配下のフォルダ名から、
 * "NNNN_<英語名>" パターンを解析して、まだ DB に居ない候補者を作成する。
 *
 * - 既存の Person.id と被ったら create はスキップ (上書きはしない)
 * - 新規候補者は ID, 英語名, driveFolderUrl, photoUrl だけ埋まる
 *   nationality / residenceStatus / channel は仮の既定値 ("不明" / "技能実習" / "LINE")
 *   後で詳細情報タブから修正する想定
 *
 * クエリ:
 *   ?dryRun=1     ... DB を更新せず log だけ出す
 *   ?max=200      ... 1 回で見るフォルダ数の上限 (デフォルト 200)
 */

const DEFAULT_PERSON_ROOT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Pmv-hFyk8DKIuu24mtMS5c26DWXmjqXr";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function getClientEmail() {
  const v = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!v) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL が未設定");
  return v;
}
function getPrivateKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY が未設定");
  return raw.replace(/\\n/g, "\n");
}

async function makeDrive() {
  const auth = new google.auth.JWT({
    email: getClientEmail(),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  await auth.authorize();
  return google.drive({ version: "v3", auth });
}

// "0090_NGUYEN VAN A" → { id: 90, name: "NGUYEN VAN A" }
function parseFolderName(name: string): { id: number; englishName: string } | null {
  const match = name.match(/^(\d{1,4})[_\s-](.+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  if (!Number.isFinite(id) || id <= 0) return null;
  const englishName = match[2].trim();
  if (!englishName) return null;
  return { id, englishName };
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const max = Math.min(Number(url.searchParams.get("max") ?? 200), 500);

    const rootFolderUrl =
      process.env.GOOGLE_CANDIDATE_FILES_FOLDER_URL?.trim() || DEFAULT_PERSON_ROOT_FOLDER_URL;
    const rootFolderId = parseGoogleDriveFolderId(rootFolderUrl);
    if (!rootFolderId) {
      return Response.json({ ok: false, error: "候補者ルートフォルダ URL を解析できません" }, { status: 500 });
    }

    const drive = await makeDrive();

    // ルート直下のフォルダ一覧 (NNNN_NAME 形式のみ対象)
    const folders: { id: string; name: string }[] = [];
    let pageToken: string | undefined;
    while (folders.length < max) {
      const res = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: "nextPageToken, files(id, name)",
        pageSize: 200,
        pageToken,
      });
      for (const f of res.data.files ?? []) {
        if (f.id && f.name) folders.push({ id: f.id, name: f.name });
        if (folders.length >= max) break;
      }
      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    // 既存 Person.id を一括取得
    const existing = await prisma.person.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((p) => p.id));

    const log: string[] = [];
    const newPersons: { id: number; name: string }[] = [];
    let parsed = 0;
    let created = 0;
    let skippedExisting = 0;
    let skippedUnparseable = 0;

    for (const folder of folders) {
      const info = parseFolderName(folder.name);
      if (!info) {
        log.push(`- ${folder.name}: 形式に合わずスキップ`);
        skippedUnparseable++;
        continue;
      }
      parsed++;
      if (existingIds.has(info.id)) {
        skippedExisting++;
        continue;
      }
      newPersons.push({ id: info.id, name: info.englishName });
    }

    if (!dryRun && newPersons.length > 0) {
      // ID を明示してインサート → シーケンスを最大 ID+1 に同期
      for (const p of newPersons) {
        try {
          await prisma.person.create({
            data: {
              id: p.id,
              name: p.name,
              nationality: "不明",
              residenceStatus: "技能実習",
              channel: "LINE",
              driveFolderUrl: `https://drive.google.com/drive/folders/${
                folders.find((f) => parseFolderName(f.name)?.id === p.id)?.id ?? ""
              }`,
              onboarding: {
                create: {
                  englishName: p.name,
                  status: "submitted",
                },
              },
              resumeProfile: { create: {} },
            },
          });
          created++;
          log.push(`✅ id=${p.id} ${p.name} を作成`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "error";
          log.push(`❌ id=${p.id} ${p.name}: ${msg}`);
        }
      }
      // 自動採番シーケンスを max(id)+1 に同期 (id を明示挿入したため)
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval('"Person_id_seq"', COALESCE((SELECT MAX(id) FROM "Person"), 0) + 1, false)`
        );
      } catch {
        // 失敗しても致命的ではない
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      summary: {
        scannedFolders: folders.length,
        parsed,
        skippedUnparseable,
        skippedExisting,
        wouldCreate: newPersons.length,
        created,
      },
      newPersons,
      log,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: err instanceof AuthError ? err.status : 500 }
    );
  }
}
