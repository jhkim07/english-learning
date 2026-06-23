// Test admin guard behavior
jest.mock("@/lib/auth/dev-bypass", () => ({
  DEV_BYPASS_AUTH: false,
  DEV_USER_ID: "dev-user-id",
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

describe("admin guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore redirect mock after clearAllMocks
    const { redirect } = require("next/navigation");
    redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("redirects to /login when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const { requireAdmin } = await import("@/lib/admin/admin-guard");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /calendar when user is not admin", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({ isAdmin: false });
    const { requireAdmin } = await import("@/lib/admin/admin-guard");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/calendar");
  });
});
