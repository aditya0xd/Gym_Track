import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getPrisma() {
  if (global.prisma) return global.prisma;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  global.prisma = new PrismaClient({ adapter });
  return global.prisma;
}

export const prisma = getPrisma();

