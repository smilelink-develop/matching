/**
 * ID 226-242 の候補者がどこから登録されたか + photoUrl がなぜ無いか診断
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const cs = getDatabaseUrl();
if (!cs) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: cs });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ids = [226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 241, 242];
  const people = await prisma.person.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      driveFolderUrl: true,
      createdAt: true,
      updatedAt: true,
      onboarding: { select: { englishName: true } },
      resumeProfile: { select: { resumeFileUrl: true } },
    },
    orderBy: { id: "asc" },
  });
  console.log("=== 候補者 226-242 の状態 ===\n");
  for (const p of people) {
    console.log(`ID=${p.id} ${p.name}`);
    console.log(`  英語名:       ${p.onboarding?.englishName ?? "(なし)"}`);
    console.log(`  photoUrl:     ${p.photoUrl ?? "❌ なし"}`);
    console.log(`  driveFolder:  ${p.driveFolderUrl ?? "❌ なし"}`);
    console.log(`  resumeFile:   ${p.resumeProfile?.resumeFileUrl ?? "❌ なし"}`);
    console.log(`  作成:         ${p.createdAt.toISOString()}`);
    console.log("");
  }

  // 比較: 222 など bulk-add で作成された候補者
  console.log("\n=== 比較: bulk-add で作成された候補者 (197-225) ===\n");
  const compareIds = [219, 220, 221, 222, 225];
  const compare = await prisma.person.findMany({
    where: { id: { in: compareIds } },
    select: { id: true, name: true, photoUrl: true, driveFolderUrl: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  for (const p of compare) {
    console.log(`ID=${p.id} ${p.name}`);
    console.log(`  photoUrl:     ${p.photoUrl ? "✅ あり" : "❌ なし"}`);
    console.log(`  driveFolder:  ${p.driveFolderUrl ? "✅ あり" : "❌ なし"}`);
    console.log(`  作成:         ${p.createdAt.toISOString()}`);
    console.log("");
  }

  // 226-242 と 古い候補者の作成時刻パターン
  console.log("\n=== ID と 作成日時 一覧 (ID 220-242) ===");
  const all = await prisma.person.findMany({
    where: { id: { gte: 220, lte: 250 } },
    select: { id: true, photoUrl: true, createdAt: true, driveFolderUrl: true, onboarding: { select: { englishName: true } } },
    orderBy: { id: "asc" },
  });
  for (const p of all) {
    const hasPhoto = p.photoUrl ? "✅" : "❌";
    const hasDrive = p.driveFolderUrl ? "✅" : "❌";
    console.log(`  ID=${p.id} ${p.createdAt.toISOString().slice(0, 19)}  photo=${hasPhoto} drive=${hasDrive}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
