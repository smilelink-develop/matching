import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const cs = getDatabaseUrl();
if (!cs) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: cs });
const prisma = new PrismaClient({ adapter });

async function main() {
  const templates = await prisma.jobPostingTemplate.findMany();
  for (const t of templates) {
    console.log(`ID=${t.id} | ${t.name}`);
    console.log(`  templateUrl: ${t.templateUrl}`);
    console.log(`  driveFolderUrl: ${t.driveFolderUrl ?? "(なし)"}`);
    console.log(`  createdAt: ${t.createdAt.toISOString()}`);
    console.log("");
  }
  await prisma.$disconnect();
}

main().catch(console.error);
