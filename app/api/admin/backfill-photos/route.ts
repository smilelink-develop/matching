import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";
import { google } from "googleapis";
import { parseGoogleDriveFolderId } from "@/lib/google-docs";

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
    const persons = await prisma.person.findMany({
      where: overwrite
        ? { driveFolderUrl: { not: null } }
        : { driveFolderUrl: { not: null }, photoUrl: null },
      select: { id: true, name: true, driveFolderUrl: true, photoUrl: true },
      orderBy: { id: "asc" },
    });

    const log: string[] = [];
    let found = 0;
    let updated = 0;
    let skipped = 0;
    let error = 0;

    for (const person of persons) {
      try {
        const folderId = parseGoogleDriveFolderId(person.driveFolderUrl!);
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
