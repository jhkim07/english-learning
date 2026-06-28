// T17: Regression tests for openLesson() auth fix
// Ensures direct userId check works for both curriculumId=null (level-based) and legacy lessons

const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdateMany = jest.fn();
const mockFindMany = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    dailyLesson: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    aIArtifact: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(async () => ({
    user: { id: "user-1", email: "user@example.com" },
  })),
}));

jest.mock("@/lib/auth/dev-bypass", () => ({
  DEV_BYPASS_AUTH: false,
}));

import { openLesson } from "@/app/(app)/lesson/actions";

const BASE_LESSON = {
  id: "lesson-1",
  studyDay: 1,
  generationStatus: "READY",
  userId: "user-1",
  curriculumId: null,
  frozenAt: null,
  isOpen: false,
};

const FROZEN_AT = new Date("2026-06-29T10:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFirst.mockResolvedValue(null);
  mockFindUnique.mockResolvedValue({ frozenAt: FROZEN_AT });
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockFindMany.mockResolvedValue([]);
});

describe("openLesson() — auth fix (T17)", () => {
  it("finds a level-based lesson where curriculumId is null", async () => {
    // Level-based lesson: curriculumId = null, owned by userId directly
    mockFindFirst.mockResolvedValue({ ...BASE_LESSON, curriculumId: null });

    const result = await openLesson("lesson-1");

    expect(result.dailyLessonId).toBe("lesson-1");
    expect(result.studyDay).toBe(1);

    // Verify the query used userId directly (not via curriculum relation)
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lesson-1",
          userId: "user-1",
          generationStatus: "READY",
        }),
      })
    );
    // Verify the old curriculum relation is NOT present
    const callArg = mockFindFirst.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("curriculum");
  });

  it("finds a legacy lesson with an existing curriculumId (backward compat)", async () => {
    mockFindFirst.mockResolvedValue({ ...BASE_LESSON, curriculumId: "curr-99" });

    const result = await openLesson("lesson-1");

    expect(result.dailyLessonId).toBe("lesson-1");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
  });

  it("throws when userId does not match (lesson not found)", async () => {
    // findFirst returns null → lesson not owned by this user
    mockFindFirst.mockResolvedValue(null);

    await expect(openLesson("lesson-1")).rejects.toThrow("Lesson not found or not ready");
  });

  it("throws when generationStatus is not READY", async () => {
    // findFirst returns null when generationStatus != READY (Prisma where filter)
    mockFindFirst.mockResolvedValue(null);

    await expect(openLesson("lesson-1")).rejects.toThrow("Lesson not found or not ready");
  });

  it("returns frozen artifacts when lesson is found", async () => {
    mockFindFirst.mockResolvedValue(BASE_LESSON);
    mockFindMany.mockResolvedValue([
      {
        artifactId: "a1",
        artifactType: "VOCABULARY_CARD",
        content: { word: "ephemeral" },
      },
      {
        artifactId: "a2",
        artifactType: "READING_PASSAGE",
        content: { text: "some passage" },
      },
    ]);

    const result = await openLesson("lesson-1");

    expect(result.artifacts.vocabCards).toHaveLength(1);
    expect(result.artifacts.readingPassage).toEqual({ text: "some passage" });
    expect(result.frozenAt).toEqual(FROZEN_AT);
  });
});
