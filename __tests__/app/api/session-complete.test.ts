// T16: Tests for POST /api/session/[lessonId]/complete
// Covers: 401 unauth, 404 IDOR, 200 normal, 200 idempotent, 409 race

const mockAuth = jest.fn();
const mockFindFirst = jest.fn();
const mockAdjustLevels = jest.fn();

jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    dailyLesson: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/engines/level-adjustment-engine", () => ({
  adjustLevels: (...args: unknown[]) => mockAdjustLevels(...args),
}));

// Provide a real-enough PrismaClientKnownRequestError class for instanceof checks
class MockPrismaClientKnownRequestError extends Error {
  code: string;
  clientVersion: string;
  constructor(message: string, { code, clientVersion }: { code: string; clientVersion: string }) {
    super(message);
    this.code = code;
    this.clientVersion = clientVersion;
    this.name = "PrismaClientKnownRequestError";
  }
}

jest.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
  },
}));

import { POST } from "@/app/api/session/[lessonId]/complete/route";
import { NextResponse } from "next/server";

// Helper to build a NextRequest-like Request and route params
function makeRequest(lessonId: string) {
  const req = new Request(`http://localhost/api/session/${lessonId}/complete`, {
    method: "POST",
  });
  return { req, params: { lessonId } };
}

const MOCK_RESULT = {
  changes: [
    { area: "VOCABULARY", from: 2.0, to: 2.1, passed: true, accuracy: 0.9 },
  ],
  allPassed: true,
  failedItems: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/session/[lessonId]/complete (T16)", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { req, params } = makeRequest("lesson-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const { req, params } = makeRequest("lesson-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(401);
  });

  it("returns 404 when lesson belongs to a different user (IDOR protection)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    // findFirst returns null → lesson not owned by user-1
    mockFindFirst.mockResolvedValue(null);

    const { req, params } = makeRequest("lesson-99");
    const response = await POST(req, { params });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Not found");

    // Confirm the IDOR query includes userId
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lesson-99",
          userId: "user-1",
        }),
      })
    );
  });

  it("returns 200 with LevelAdjustmentResult on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "lesson-1", userId: "user-1" });
    mockAdjustLevels.mockResolvedValue(MOCK_RESULT);

    const { req, params } = makeRequest("lesson-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.allPassed).toBe(true);
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].area).toBe("VOCABULARY");
    expect(body.failedItems).toEqual([]);

    expect(mockAdjustLevels).toHaveBeenCalledWith("user-1", "lesson-1");
  });

  it("returns 200 on second call (idempotent — adjustLevels returns cached result)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "lesson-1", userId: "user-1" });
    // adjustLevels is idempotent internally; second call returns same result
    mockAdjustLevels.mockResolvedValue(MOCK_RESULT);

    const { req: req1, params: params1 } = makeRequest("lesson-1");
    const r1 = await POST(req1, { params: params1 });
    expect(r1.status).toBe(200);

    const { req: req2, params: params2 } = makeRequest("lesson-1");
    const r2 = await POST(req2, { params: params2 });
    expect(r2.status).toBe(200);

    const body = await r2.json();
    expect(body.allPassed).toBe(true);
  });

  it("returns 409 on Prisma P2002 race condition", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "lesson-1", userId: "user-1" });

    const prismaError = new MockPrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    mockAdjustLevels.mockRejectedValue(prismaError);

    const { req, params } = makeRequest("lesson-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already processed");
  });

  it("re-throws unknown errors (non-P2002)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "lesson-1", userId: "user-1" });

    const unknownError = new Error("DB connection lost");
    mockAdjustLevels.mockRejectedValue(unknownError);

    const { req, params } = makeRequest("lesson-1");
    await expect(POST(req, { params })).rejects.toThrow("DB connection lost");
  });
});
