import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const cs = getDatabaseUrl();
if (!cs) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: cs });
const prisma = new PrismaClient({ adapter });

async function main() {
  const IDS = [249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263];
  const persons = await prisma.person.findMany({
    where: { id: { in: IDS } },
    select: {
      id: true,
      name: true,
      onboarding: { select: { englishName: true } },
    },
    orderBy: { id: "asc" },
  });
  console.log("系の 249〜263:");
  const found = new Set(persons.map((p) => p.id));
  for (const id of IDS) {
    const p = persons.find((x) => x.id === id);
    if (p) {
      console.log(`  pid=${p.id} ${p.name} / ${p.onboarding?.englishName ?? "(no english)"}`);
    } else {
      console.log(`  pid=${id} (欠番)`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
