/**
 * Partner の 主担当 → 直下フィールド 統合 + channel → preferredChannels 移行。
 *
 * 変更内容:
 *   ① 各 Partner の主担当 (PartnerContact.isPrimary=true) の name/email/phone を、
 *      Partner の contactName/email/contactPhone にコピー (既存空欄のみ)
 *   ② 各 Partner の channel が設定されていて、preferredChannels が空なら
 *      preferredChannels = channel にコピー
 *
 * PartnerContact テーブル自体は 温存 (後方互換のため削除しない)。
 * DRY_RUN=1 でプレビュー、本実行で更新。
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const cs = getDatabaseUrl();
if (!cs) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: cs });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("============================================");
  console.log("Partner 統合 migration");
  console.log(`DRY_RUN: ${DRY_RUN ? "✅" : "❌ (本実行)"}`);
  console.log("============================================\n");

  const partners = await prisma.partner.findMany({
    select: {
      id: true,
      name: true,
      contactName: true,
      contactPhone: true,
      email: true,
      channel: true,
      preferredChannels: true,
      contacts: {
        where: { isPrimary: true },
        select: { name: true, email: true, phone: true },
        take: 1,
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Partner 数: ${partners.length}\n`);

  let updatedContactCount = 0;
  let updatedChannelCount = 0;
  let bothUpdatedCount = 0;
  let noopCount = 0;

  for (const p of partners) {
    const primary = p.contacts[0] ?? null;

    // ① 主担当 → 直下フィールド (既存空欄のみコピー)
    const contactUpdates: {
      contactName?: string;
      contactPhone?: string;
      email?: string;
    } = {};
    if (primary) {
      if (!p.contactName?.trim() && primary.name?.trim()) contactUpdates.contactName = primary.name;
      if (!p.contactPhone?.trim() && primary.phone?.trim()) contactUpdates.contactPhone = primary.phone;
      if (!p.email?.trim() && primary.email?.trim()) contactUpdates.email = primary.email;
    }
    const contactChanged = Object.keys(contactUpdates).length > 0;

    // ② channel → preferredChannels (preferredChannels が空 & channel が設定済み)
    const channelUpdates: { preferredChannels?: string } = {};
    if (!p.preferredChannels?.trim() && p.channel?.trim()) {
      channelUpdates.preferredChannels = p.channel;
    }
    const channelChanged = Object.keys(channelUpdates).length > 0;

    if (!contactChanged && !channelChanged) {
      noopCount++;
      continue;
    }

    if (contactChanged) updatedContactCount++;
    if (channelChanged) updatedChannelCount++;
    if (contactChanged && channelChanged) bothUpdatedCount++;

    if (DRY_RUN) {
      console.log(`[DRY] ID=${p.id} ${p.name}`);
      if (contactChanged) console.log(`      連絡先: ${JSON.stringify(contactUpdates)}`);
      if (channelChanged) console.log(`      チャネル: ${JSON.stringify(channelUpdates)}`);
    } else {
      await prisma.partner.update({
        where: { id: p.id },
        data: { ...contactUpdates, ...channelUpdates },
      });
      console.log(`✅ ID=${p.id} ${p.name}: ${contactChanged ? "連絡先" : ""}${contactChanged && channelChanged ? " + " : ""}${channelChanged ? "チャネル" : ""}`);
    }
  }

  console.log("\n============================================");
  console.log("📊 サマリー");
  console.log("============================================");
  console.log(`  連絡先フィールド更新: ${updatedContactCount} 件`);
  console.log(`  preferredChannels 更新: ${updatedChannelCount} 件`);
  console.log(`  両方更新: ${bothUpdatedCount} 件`);
  console.log(`  変更なし: ${noopCount} 件`);
  console.log("\n" + (DRY_RUN ? "🔍 DRY RUN" : "✅ 完了"));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
