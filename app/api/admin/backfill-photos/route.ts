import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";
import { google, type drive_v3 } from "googleapis";
import { findFolderByPrefix, formatPersonIdPrefix, parseGoogleDriveFolderId } from "@/lib/google-docs";

const DEFAULT_PERSON_ROOT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Pmv-hFyk8DKIuu24mtMS5c26DWXmjqXr";

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

type DriveFile = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
};

const PHOTO_KEYWORDS = ["顔写真", "顔", "プロフィール", "profile", "photo", "face"];
// 在留カード/パスポート/履歴書/PDF など「顔写真ではない」候補を除外
const PHOTO_EXCLUDE = [
  "在留",
  "カード",
  "card",
  "パスポート",
  "passport",
  "履歴書",
  "resume",
  "免許",
  "license",
  "卒業",
  "diploma",
  "賃貸",
  "saving",
  "banking",
  "通帳",
  "申請",
  "結果",
  "保険",
];

function isImage(mime: string | null | undefined) {
  return (mime ?? "").startsWith("image/");
}

function isPdf(mime: string | null | undefined) {
  return mime === "application/pdf";
}

function nameHasAny(name: string, keywords: string[]) {
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * 画像ファイル群から「顔写真」と思しきものを最優先で選ぶ。
 * PDF も「顔写真キーワードを含むファイル名」のものだけ候補に入れる
 * (Drive thumbnail エンドポイントは PDF の 1 ページ目を画像として返すので
 * '0089_顔写真.pdf' のようなスキャンも表示できる)
 */
function pickPhotoFile(files: DriveFile[]): DriveFile | null {
  const explicitPhotos = files.filter(
    (f) =>
      (isImage(f.mimeType) || isPdf(f.mimeType)) &&
      nameHasAny(f.name ?? "", PHOTO_KEYWORDS) &&
      !nameHasAny(f.name ?? "", PHOTO_EXCLUDE)
  );
  if (explicitPhotos.length > 0) return explicitPhotos[0];

  // 顔写真キーワード無しの画像 (除外キーワードに当たらないもの) を次点
  const safeImages = files.filter(
    (f) => isImage(f.mimeType) && !nameHasAny(f.name ?? "", PHOTO_EXCLUDE)
  );
  if (safeImages.length > 0) return safeImages[0];

  // 全部除外対象なら何も選ばない (在留カード等を誤選択するよりマシ)
  return null;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * フォルダ内のすべての項目 (ファイル + サブフォルダ) を再帰的に列挙する。
 * 候補者フォルダの中にさらにフォルダが切られているケースに対応。
 * PDF も顔写真候補として収集する (ファイル名で「顔写真」を含むものはスキャンの可能性大)。
 */
async function listAllPhotoCandidates(
  drive: drive_v3.Drive,
  rootFolderId: string,
  maxDepth = 3
): Promise<{ files: DriveFile[]; visited: number }> {
  const files: DriveFile[] = [];
  let visited = 0;
  const queue: { id: string; depth: number }[] = [{ id: rootFolderId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    visited++;
    const res = await drive.files.list({
      q: `'${id}' in parents and trashed = false`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: "files(id, name, mimeType)",
      pageSize: 100,
    });
    for (const file of res.data.files ?? []) {
      if (file.mimeType === FOLDER_MIME) {
        if (depth < maxDepth && file.id) {
          queue.push({ id: file.id, depth: depth + 1 });
        }
      } else if (isImage(file.mimeType) || isPdf(file.mimeType)) {
        files.push(file);
      }
    }
  }
  return { files, visited };
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);
    const overwrite = url.searchParams.get("overwrite") === "1";
    // ?ids=75,79 のように特定の候補者だけ強制更新するためのフィルタ
    const idsParam = url.searchParams.get("ids");
    const targetIds = idsParam
      ? idsParam
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : null;

    // ?limit=20&offset=0 で分割処理 (Railway の HTTP タイムアウトを避ける)
    // 1 人につき Drive API を数回叩くので 20 人前後ずつが安全
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const drive = await makeDrive();
    const where = targetIds
      ? { id: { in: targetIds } }
      : overwrite
        ? {}
        : { photoUrl: null };

    const totalRemaining = await prisma.person.count({ where });
    const persons = await prisma.person.findMany({
      where,
      select: { id: true, name: true, driveFolderUrl: true, photoUrl: true },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    });

    const personRootFolderUrl =
      process.env.GOOGLE_CANDIDATE_FILES_FOLDER_URL?.trim() || DEFAULT_PERSON_ROOT_FOLDER_URL;

    const log: string[] = [];
    let foundCount = 0;
    let updated = 0;
    let skipped = 0;
    let error = 0;

    for (const person of persons) {
      try {
        let folderId = person.driveFolderUrl ? parseGoogleDriveFolderId(person.driveFolderUrl) : null;
        let resolvedFolderUrl = person.driveFolderUrl;
        if (!folderId) {
          const prefix = formatPersonIdPrefix(person.id) + "_";
          const found = await findFolderByPrefix({
            parentFolderUrl: personRootFolderUrl,
            namePrefix: prefix,
          });
          if (!found) {
            log.push(`⚠️ id=${person.id} ${person.name}: 候補者フォルダが見つからない (${prefix})`);
            skipped++;
            continue;
          }
          folderId = found.folderId;
          resolvedFolderUrl = found.folderUrl;
          await prisma.person.update({
            where: { id: person.id },
            data: { driveFolderUrl: resolvedFolderUrl },
          });
        }
        if (!folderId) {
          log.push(`id=${person.id} ${person.name}: folderId 取得失敗`);
          skipped++;
          continue;
        }
        // 候補者フォルダ + サブフォルダを再帰的に走査 (深さ 2 まで)
        // 深さ 3 にすると全員バッチで Railway HTTP タイムアウトを超えやすい
        const { files: imageOrPdfFiles, visited } = await listAllPhotoCandidates(drive, folderId, 2);
        const photo = pickPhotoFile(imageOrPdfFiles);
        if (!photo?.id) {
          log.push(
            `⚠️ id=${person.id} ${person.name}: 顔写真候補なし (走査フォルダ ${visited}, 候補ファイル ${imageOrPdfFiles.length})`
          );
          skipped++;
          continue;
        }
        const photoUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
        if (person.photoUrl === photoUrl) {
          log.push(`= id=${person.id} ${person.name}: 既に同じ写真 (${photo.name})`);
          foundCount++;
          continue;
        }
        await prisma.person.update({ where: { id: person.id }, data: { photoUrl } });
        log.push(`✅ id=${person.id} ${person.name} ← ${photo.name}`);
        foundCount++;
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "error";
        log.push(`❌ id=${person.id} ${person.name}: ${msg}`);
        error++;
      }
    }

    const nextOffset = offset + persons.length;
    const hasMore = nextOffset < totalRemaining;
    return Response.json({
      ok: true,
      summary: {
        processed: persons.length,
        totalRemaining,
        offset,
        nextOffset,
        hasMore,
        found: foundCount,
        updated,
        skipped,
        error,
      },
      log,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: err instanceof AuthError ? err.status : 500 }
    );
  }
}
