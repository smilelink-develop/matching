import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";
import { google } from "googleapis";
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

type DriveFile = { id?: string | null; name?: string | null; mimeType?: string | null };

function pickPhotoFile(files: DriveFile[]) {
  const images = files.filter((f) => (f.mimeType ?? "").startsWith("image/"));
  if (images.length === 0) return null;
  const byKeyword = (kw: string) =>
    images.find((f) => (f.name ?? "").toLowerCase().includes(kw.toLowerCase()));
  return byKeyword("顔写真") || byKeyword("photo") || byKeyword("face") || images[0];
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);
    const overwrite = url.searchParams.get("overwrite") === "1";

    const drive = await makeDrive();
    // driveFolderUrl が無い候補者も対象 (ルートフォルダから ID プレフィックスで検索する)
    const persons = await prisma.person.findMany({
      where: overwrite ? {} : { photoUrl: null },
      select: { id: true, name: true, driveFolderUrl: true, photoUrl: true },
      orderBy: { id: "asc" },
    });

    const personRootFolderUrl =
      process.env.GOOGLE_CANDIDATE_FILES_FOLDER_URL?.trim() || DEFAULT_PERSON_ROOT_FOLDER_URL;

    const log: string[] = [];
    let found = 0;
    let updated = 0;
    let skipped = 0;
    let error = 0;

    for (const person of persons) {
      try {
        // driveFolderUrl があればそれ、無ければ候補者ルートから ID プレフィックスでフォルダ検索
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
          // 同時に Person.driveFolderUrl も保存しておく
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
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          fields: "files(id, name, mimeType)",
          pageSize: 50,
        });
        const files = res.data.files ?? [];
        const photo = pickPhotoFile(files);
        if (!photo?.id) {
          log.push(`id=${person.id} ${person.name}: 画像なし (ファイル数 ${files.length})`);
          skipped++;
          continue;
        }
        const photoUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
        if (person.photoUrl === photoUrl) {
          log.push(`id=${person.id} ${person.name}: 既に設定済み`);
          found++;
          continue;
        }
        await prisma.person.update({ where: { id: person.id }, data: { photoUrl } });
        log.push(`✅ id=${person.id} ${person.name} ← ${photo.name}`);
        found++;
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "error";
        log.push(`❌ id=${person.id} ${person.name}: ${msg}`);
        error++;
      }
    }

    return Response.json({
      ok: true,
      summary: { total: persons.length, found, updated, skipped, error },
      log,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
