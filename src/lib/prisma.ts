import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getPrisma() {
  if (global.prisma) return global.prisma;

  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Set SSL mode based on environment
  // Production requires verify-full for security, development uses disable
  const isProduction = process.env.NODE_ENV === "production";
  const sslMode = isProduction ? "verify-full" : "disable";
  
  if (!databaseUrl.includes("sslmode=")) {
    databaseUrl = databaseUrl.includes("?")
      ? `${databaseUrl}&sslmode=${sslMode}`
      : `${databaseUrl}?sslmode=${sslMode}`;
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  global.prisma = new PrismaClient({ adapter });
  return global.prisma;
}

export const prisma = getPrisma();
