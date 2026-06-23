// Mock the auth module
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock Next.js redirect
jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { requireAuth, getSession } from "@/lib/session";
import { auth } from "@/auth";

// Cast to jest.Mock to avoid overloaded function type issues with mockResolvedValue
const mockAuth = auth as unknown as jest.Mock;

describe("requireAuth", () => {
  it("returns session when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      expires: new Date(Date.now() + 3600000).toISOString(),
    });

    const session = await requireAuth();
    expect(session.user.id).toBe("user-123");
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("getSession", () => {
  it("returns null when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });
});
