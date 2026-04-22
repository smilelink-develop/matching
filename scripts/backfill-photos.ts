import "dotenv/config";
import { google } from "googleapis";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";
import { parseGoogleDriveFolderId } from "../lib/google-docs";

const connectionString = getDatabaseUrl();
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

function pickPhotoFile(files: { id?: string | null; name?: string | null; mimeType?: string | null }[]) {
  const images = files.filter((f) => (f.mimeType ?? "").startsWith("image/"));
  if (images.length === 0) return null;
  // 優先度: 顔写真 > photo > face > 最初の画像
  const byKeyword = (kw: string) =>
    images.find((f) => (f.name ?? "").toLowerCase().includes(kw.toLowerCase()));
  return byKeyword("顔写真") || byKeyword("photo") || byKeyword("face") || images[0];
}

async function main() {
  const drive = await makeDrive();
  const persons = await prisma.person.findMany({
    where: { driveFolderUrl: { not: null } },
    select: { id: true, name: true, driveFolderUrl: true, photoUrl: true },
    orderBy: { id: "asc" },
  });

  console.log(`候補者 ${persons.length} 件をスキャンします\n`);

  let found = 0;
  let updated = 0;
  let skipped = 0;
  let error = 0;

  for (const person of persons) {
    try {
      const folderId = parseGoogleDriveFolderId(person.driveFolderUrl!);
      if (!folderId) {
        console.log(`  id=${person.id} ${person.name} / folderId 取得失敗`);
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
        console.log(`  id=${person.id} ${person.name} / 画像なし (${files.length}ファイル)`);
        skipped++;
        continue;
      }

      // サービスアカウント認証で直接表示できる thumbnail URL を採用
      const photoUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w400`;
      if (person.photoUrl === photoUrl) {
        console.log(`  id=${person.id} ${person.name} / 既に同じ URL が設定済み`);
        found++;
        continue;
      }

      await prisma.person.update({
        where: { id: person.id },
        data: { photoUrl },
      });
      console.log(`  ✅ id=${person.id} ${person.name} ← ${photo.name}`);
      found++;
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "error";
      console.log(`  ❌ id=${person.id} ${person.name} / ${msg}`);
      error++;
    }
  }

  console.log(
    `\n結果: 見つかった ${found} / 更新 ${updated} / スキップ ${skipped} / エラー ${error}`
  );
}

main()
  .catch((error) => {
    console.error("❌ 失敗:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
