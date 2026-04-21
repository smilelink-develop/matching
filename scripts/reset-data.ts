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
  console.log("⚠️  業務データを削除します (StaffAccount は保持)");
  console.log("対象: Person, Company, Deal, Partner, Invoice, JobPosting, Placement, CustomQuestion, Messages, etc.");

  // 依存関係の逆順で削除
  await prisma.invoice.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.jobPostingTemplate.deleteMany();
  await prisma.personPlacement.deleteMany();
  await prisma.personCustomQuestion.deleteMany();
  await prisma.dealCandidate.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.resumeDocument.deleteMany();
  await prisma.resumeProfile.deleteMany();
  await prisma.resumeTemplate.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.lineProfile.deleteMany();
  await prisma.messengerProfile.deleteMany();
  await prisma.portalTask.deleteMany();
  await prisma.portalDocument.deleteMany();
  await prisma.personOnboarding.deleteMany();
  await prisma.person.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.company.deleteMany();
  await prisma.onboardingFormQuestion.deleteMany();
  await prisma.onboardingFormTemplate.deleteMany();

  // ID シーケンスをリセット (1 から採番し直す)
  const tables = [
    "Person",
    "Company",
    "Deal",
    "Partner",
    "Invoice",
    "JobPosting",
    "JobPostingTemplate",
    "PersonPlacement",
    "PersonCustomQuestion",
    "DealCandidate",
    "ResumeDocument",
    "ResumeProfile",
    "ResumeTemplate",
    "Group",
    "GroupMember",
    "Message",
    "MessageTemplate",
    "MessageLog",
    "LineProfile",
    "MessengerProfile",
    "PortalTask",
    "PortalDocument",
    "PersonOnboarding",
    "OnboardingFormQuestion",
    "OnboardingFormTemplate",
  ];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1`);
    } catch {
      // シーケンスが無いテーブルは無視
    }
  }

  const staff = await prisma.staffAccount.count();
  console.log(`✅ 業務データを削除しました。残った StaffAccount: ${staff} 件`);
}

main()
  .catch((error) => {
    console.error("❌ 失敗:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
