import { prisma } from "@/lib/db";

describe("Prisma client singleton", () => {
  it("returns the same instance on multiple imports", async () => {
    const { prisma: prisma2 } = await import("@/lib/db");
    expect(prisma).toBe(prisma2);
  });

  it("is a PrismaClient instance", () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });
});
