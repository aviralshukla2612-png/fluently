import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/**
 * Creates or retrieves the singleton Prisma Client instance.
 * Preserves connections across Next.js development hot-reloads.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks if the DATABASE_URL environment variable is present.
 * @returns {boolean}
 */
export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes("your-postgresql-url"));
}

/**
 * Attempts a lightweight connection ping to PostgreSQL.
 * @returns {Promise<{ connected: boolean, error?: string }>}
 */
export async function checkDatabaseConnection() {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      error: "DATABASE_URL is not configured.",
    };
  }

  try {
    // Perform quick verification query
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err.message || "Unable to establish database connection.",
    };
  }
}
