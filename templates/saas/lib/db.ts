import { PrismaClient } from "@prisma/client";

// Reuse a single client across hot reloads in dev (see Prisma's Next.js guide);
// without this, `next dev` creates a new client per reload and exhausts
// Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
