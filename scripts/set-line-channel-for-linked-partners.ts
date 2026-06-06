/**
 * LINE が紐づいているパートナー (lineUserId 設定済 or LineGroup あり) で
 * 主な連絡手段 (channel) が "LINE" 以外になっているものを "LINE" に更新する。
 *
 * 使い方:
 *   npx tsx scripts/set-line-channel-for-linked-partners.ts          # dry-run (確認のみ)
 *   npx tsx scripts/set-line-channel-for-linked-partners.ts --apply  # 実際に更新
 */
import { prisma } from "../lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");

  const partners = await prisma.partner.findMany({
    where: {
      OR: [
        { lineUserId: { not: null } },
        { lineGroups: { some: { isActive: true } } },
      ],
    },
    include: {
      lineGroups: {
        where: { isActive: true },
        select: { groupName: true },
        take: 1,
      },
    },
    orderBy: { id: "asc" },
  });

  const toUpdate = partners.filter((p) => p.channel !== "LINE");
  const alreadyLine = partners.length - toUpdate.length;

  console.log(`📊 LINE 紐づけ済みパートナー総数: ${partners.length} 社`);
  console.log(`   - 既に主な連絡手段=LINE: ${alreadyLine} 社`);
  console.log(`   - 主な連絡手段≠LINE (更新対象): ${toUpdate.length} 社`);
  console.log("");

  if (toUpdate.length === 0) {
    console.log("✅ 全パートナーが既に LINE 設定済みです。何もしません。");
    return;
  }

  console.log("【更新対象一覧】");
  toUpdate.slice(0, 50).forEach((p) => {
    const linkType = p.lineUserId
      ? `個人LINE`
      : `LINEグループ「${p.lineGroups[0]?.groupName ?? "?"}」`;
    console.log(
      `  #${p.id}\t${p.name.padEnd(30)}\t現在=${p.channel ?? "未設定"} → LINE\t(${linkType})`
    );
  });
  if (toUpdate.length > 50) {
    console.log(`  ... 他 ${toUpdate.length - 50} 件`);
  }

  if (!apply) {
    console.log("");
    console.log(`💡 これは dry-run です。実際に更新するには --apply を付けて再実行してください:`);
    console.log(`   npx tsx scripts/set-line-channel-for-linked-partners.ts --apply`);
    return;
  }

  console.log("");
  console.log(`🚀 ${toUpdate.length} 社を更新中...`);
  const result = await prisma.partner.updateMany({
    where: {
      id: { in: toUpdate.map((p) => p.id) },
    },
    data: { channel: "LINE" },
  });
  console.log(`✅ 更新完了: ${result.count} 件`);
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
