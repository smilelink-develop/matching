import "dotenv/config";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prismaInstance?: PrismaClient;
};

function getPrismaInstance(): PrismaClient {
  if (globalForPrisma.prismaInstance) return globalForPrisma.prismaInstance;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  // 本番でも globalThis にキャッシュする (Railway の long-running Node プロセスで
  // インスタンスが増え続けて TooManyConnections になるのを防ぐ)
  globalForPrisma.prismaInstance = client;

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrismaInstance(), prop);
  },
});
