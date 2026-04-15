import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const connectionString = getDatabaseUrl();

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.lineProfile.deleteMany();
  await prisma.messengerProfile.deleteMany();
  await prisma.person.deleteMany();

  await prisma.person.createMany({
    data: [
      {
        name: "グエン・ヴァン・アン",
        nationality: "ベトナム",
        department: "製造部",
        residenceStatus: "技能実習",
        channel: "LINE",
        lineUserId: "U10000000000000000000000000000001",
      },
      {
        name: "シティ・ラフマ",
        nationality: "インドネシア",
        department: "品質管理",
        residenceStatus: "特定技能1号",
        channel: "Messenger",
        messengerPsid: "psid-demo-0002",
      },
      {
        name: "アウン・モー",
        nationality: "ミャンマー",
        department: "物流",
        residenceStatus: "特定技能2号",
        channel: "LINE",
        lineUserId: "U10000000000000000000000000000003",
      },
      {
        name: "マリア・サントス",
        nationality: "フィリピン",
        department: "総務",
        residenceStatus: "技術・人文知識・国際業務",
        channel: "mail",
        email: "maria.santos@example.com",
      },
      {
        name: "チャノン・スパチャイ",
        nationality: "タイ",
        department: "営業",
        residenceStatus: "特定技能1号",
        channel: "WhatsApp",
        whatsappId: "whatsapp-demo-0005",
      },
      {
        name: "リー・メイ",
        nationality: "その他",
        department: "開発",
        residenceStatus: "技術・人文知識・国際業務",
        channel: "LINE",
        lineUserId: "U10000000000000000000000000000006",
      },
    ],
  });

  const persons = await prisma.person.findMany({
    orderBy: { id: "asc" },
  });

  const linePersons = persons.filter((person) => person.lineUserId);
  const messengerPersons = persons.filter((person) => person.messengerPsid);

  await prisma.lineProfile.createMany({
    data: linePersons.map((person) => ({
      lineUserId: person.lineUserId!,
      displayName: person.name,
      lastMessageText: "よろしくお願いします",
      lastWebhookType: "message",
      lastSeenAt: new Date(),
    })),
  });

  await prisma.messengerProfile.createMany({
    data: messengerPersons.map((person) => ({
      psid: person.messengerPsid!,
      lastMessageText: "Messengerで連絡しました",
      lastWebhookType: "message",
      lastSeenAt: new Date(),
    })),
  });

  await prisma.messageTemplate.createMany({
    data: [
      {
        name: "面談日程のご案内",
        content: "いつもありがとうございます。面談日程についてご確認をお願いします。",
      },
      {
        name: "在留期限のお知らせ",
        content: "在留期限が近づいています。必要書類の準備をお願いします。",
      },
      {
        name: "就業開始のご案内",
        content: "就業開始日が確定しました。詳細は担当者よりご連絡します。",
      },
    ],
  });

  await prisma.group.createMany({
    data: [
      { name: "製造・物流チーム" },
      { name: "オフィス連絡先" },
    ],
  });

  const groups = await prisma.group.findMany({ orderBy: { id: "asc" } });

  await prisma.groupMember.createMany({
    data: [
      { groupId: groups[0].id, personId: persons[0].id },
      { groupId: groups[0].id, personId: persons[2].id },
      { groupId: groups[1].id, personId: persons[3].id },
      { groupId: groups[1].id, personId: persons[5].id },
    ],
  });

  await prisma.messageLog.createMany({
    data: [
      {
        title: "在留期限に関するお知らせ",
        body: "在留期限が近い方へ連絡済みです。",
        channel: "LINE",
        targetFilter: "国籍: ベトナム / 連絡手段: LINE",
        status: "送信成功",
        matchedCount: 2,
        sentCount: 2,
        skippedCount: 0,
      },
      {
        title: "面談日の確認",
        body: "Messenger対象者へ送信しました。",
        channel: "Messenger",
        targetFilter: "部署: 品質管理 / 連絡手段: Messenger",
        status: "送信成功",
        matchedCount: 1,
        sentCount: 1,
        skippedCount: 0,
      },
    ],
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
