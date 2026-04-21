import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl()! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Company:", await prisma.company.count());
  console.log("Person:", await prisma.person.count());
  console.log("Deal:", await prisma.deal.count());
  console.log("JobPosting:", await prisma.jobPosting.count());
  console.log("Invoice:", await prisma.invoice.count());
  console.log("PersonPlacement:", await prisma.personPlacement.count());
  console.log("Partner:", await prisma.partner.count());

  const p = await prisma.person.findFirst({
    include: { onboarding: true, resumeProfile: true, partner: true, placement: true },
  });
  console.log("--- sample person ---");
  console.log("name:", p?.name);
  console.log("nationality:", p?.nationality);
  console.log("residence:", p?.residenceStatus);
  console.log("driveFolder:", p?.driveFolderUrl);
  console.log("onboarding.englishName:", p?.onboarding?.englishName);
  console.log("onboarding.birthDate:", p?.onboarding?.birthDate);
  console.log("onboarding.address:", p?.onboarding?.address);
  console.log("resumeProfile.japaneseLevel:", p?.resumeProfile?.japaneseLevel);
  console.log("resumeProfile.motivation:", p?.resumeProfile?.motivation?.slice(0, 80));
  console.log("placement.offerAt:", p?.placement?.offerAt);

  const d = await prisma.deal.findFirst({ include: { company: true } });
  console.log("--- sample deal ---");
  console.log(d?.title, "/", d?.company.name, "/", d?.status, "/", d?.requiredCount, "募集");
}
main().finally(() => prisma.$disconnect());
