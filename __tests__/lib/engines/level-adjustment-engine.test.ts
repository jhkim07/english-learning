import { adjustLevels } from "@/lib/engines/level-adjustment-engine";

// Mock prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    levelHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    levelProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    flashcardAttempt: {
      findMany: jest.fn(),
    },
    readingAttempt: {
      findMany: jest.fn(),
    },
    speakingEvaluation: {
      findMany: jest.fn(),
    },
    writingSubmission: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock @prisma/client enums
jest.mock("@prisma/client", () => ({
  LevelArea: {
    VOCABULARY: "VOCABULARY",
    CONVERSATION: "CONVERSATION",
    READING: "READING",
    WRITING: "WRITING",
  },
  LevelChangeReason: {
    ALL_PASSED: "ALL_PASSED",
    AREA_FAILED: "AREA_FAILED",
    INITIAL: "INITIAL",
  },
}));

import { prisma } from "@/lib/db";

const MOCK_USER_ID = "user-test-123";
const MOCK_LESSON_ID = "lesson-test-456";

const DEFAULT_LEVEL_PROFILE = {
  id: "profile-1",
  userId: MOCK_USER_ID,
  vocabulary: 2.0,
  conversation: 2.0,
  reading: 2.0,
  writing: 2.0,
  sessionCount: 5,
  pendingReviewItems: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeFlashcard(response: number, cardId = `card-${response}`) {
  return { id: `fc-${Math.random()}`, userId: MOCK_USER_ID, dailyLessonId: MOCK_LESSON_ID, cardId, response };
}

function makeReadingAttempt(isCorrect: boolean) {
  return { id: `ra-${Math.random()}`, userId: MOCK_USER_ID, dailyLessonId: MOCK_LESSON_ID, questionId: `q-${Math.random()}`, isCorrect };
}

function makeSpeakingEval(score: number) {
  return { id: `se-${Math.random()}`, userId: MOCK_USER_ID, dailyLessonId: MOCK_LESSON_ID, score };
}

function makeWritingSubmission(evaluationScore: number) {
  return { id: `ws-${Math.random()}`, userId: MOCK_USER_ID, dailyLessonId: MOCK_LESSON_ID, evaluationScore };
}

describe("adjustLevels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing history records
    (prisma.levelHistory.findMany as jest.Mock).mockResolvedValue([]);
    // Default profile
    (prisma.levelProfile.findUnique as jest.Mock).mockResolvedValue(DEFAULT_LEVEL_PROFILE);
    // Default: $transaction resolves
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
  });

  // T1: All pass → all areas get +0.1, LevelHistory reason = ALL_PASSED
  it("T1: all areas pass → each area increases by 0.1 with ALL_PASSED reason", async () => {
    // Flashcards: 4/4 correct (response >= 2)
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([
      makeFlashcard(2), makeFlashcard(3), makeFlashcard(2), makeFlashcard(3),
    ]);
    // Reading: 4/4 correct
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([
      makeReadingAttempt(true), makeReadingAttempt(true), makeReadingAttempt(true), makeReadingAttempt(true),
    ]);
    // Speaking: score >= 0.7
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([makeSpeakingEval(0.85)]);
    // Writing: score >= 0.7
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([makeWritingSubmission(0.9)]);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    expect(result.allPassed).toBe(true);
    expect(result.changes).toHaveLength(4);

    const vocabChange = result.changes.find(c => c.area === "VOCABULARY");
    expect(vocabChange).toBeDefined();
    expect(vocabChange!.from).toBe(2.0);
    expect(vocabChange!.to).toBe(2.1);
    expect(vocabChange!.passed).toBe(true);

    // Verify transaction was called with ALL_PASSED reasons
    expect(prisma.$transaction as jest.Mock).toHaveBeenCalled();
    const txArgs = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    // The transaction array includes levelProfile.update + 4 levelHistory.creates
    expect(txArgs).toHaveLength(5);
  });

  // T2: One area fails (vocabulary) → vocab -0.1, others stay, allPassed = false
  it("T2: vocabulary fails → vocab level decreases, others unchanged, allPassed false", async () => {
    // Flashcards: 2/4 correct (50% < 75% threshold) → fail
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([
      makeFlashcard(0, "card-bad-1"), makeFlashcard(1, "card-bad-2"),
      makeFlashcard(2, "card-good-1"), makeFlashcard(3, "card-good-2"),
    ]);
    // Reading: 100% correct
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([
      makeReadingAttempt(true), makeReadingAttempt(true),
    ]);
    // Speaking: good score
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([makeSpeakingEval(0.8)]);
    // Writing: good score
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([makeWritingSubmission(0.75)]);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    expect(result.allPassed).toBe(false);

    const vocabChange = result.changes.find(c => c.area === "VOCABULARY");
    expect(vocabChange!.from).toBe(2.0);
    expect(vocabChange!.to).toBe(1.9);
    expect(vocabChange!.passed).toBe(false);

    // Other areas should stay the same (no allPassed bonus, vocab failed → delta 0 for passing areas)
    const readingChange = result.changes.find(c => c.area === "READING");
    expect(readingChange!.from).toBe(2.0);
    expect(readingChange!.to).toBe(2.0);
    expect(readingChange!.passed).toBe(true);
  });

  // T3: All areas skipped (0 items) → NO level change (somethingAttempted = false → allPassed = false → no +0.1)
  it("T3: all areas skipped (0 items) → no level change", async () => {
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([]);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    expect(result.allPassed).toBe(false);
    result.changes.forEach(c => {
      expect(c.from).toBe(c.to); // no change
    });
  });

  // T4: NaN prevention: 0 correct out of 0 items → accuracy = null → treated as pass (skip)
  it("T4: 0/0 items → accuracy null → treated as skip (no penalty)", async () => {
    // Only vocab attempted, others are 0/0
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([
      makeFlashcard(2), makeFlashcard(3),
    ]);
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([]);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    // somethingAttempted = true (vocab was attempted), vocab passes at 100%
    // Reading/Conversation/Writing: null (skip) → not penalized
    expect(result.allPassed).toBe(true);

    const readingChange = result.changes.find(c => c.area === "READING");
    // Reading was skipped so accuracy is null → passed = true (skip treated as pass)
    expect(readingChange!.passed).toBe(true);
    // All passed → +0.1 for all areas
    expect(readingChange!.to).toBe(2.1);
  });

  // T5: Idempotency: if LevelHistory records exist → return existing, no DB update
  it("T5: idempotency — existing LevelHistory records → return without DB update", async () => {
    const existingRecords = [
      { area: "VOCABULARY", fromLevel: 2.0, toLevel: 2.1, reason: "ALL_PASSED", dailyLessonId: MOCK_LESSON_ID },
      { area: "READING", fromLevel: 2.0, toLevel: 2.1, reason: "ALL_PASSED", dailyLessonId: MOCK_LESSON_ID },
      { area: "CONVERSATION", fromLevel: 2.0, toLevel: 2.1, reason: "ALL_PASSED", dailyLessonId: MOCK_LESSON_ID },
      { area: "WRITING", fromLevel: 2.0, toLevel: 2.1, reason: "ALL_PASSED", dailyLessonId: MOCK_LESSON_ID },
    ];
    (prisma.levelHistory.findMany as jest.Mock).mockResolvedValue(existingRecords);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    expect(result.allPassed).toBe(true);
    expect(result.changes).toHaveLength(4);
    // Should NOT have called $transaction or the DB update
    expect(prisma.$transaction as jest.Mock).not.toHaveBeenCalled();
    expect(prisma.flashcardAttempt.findMany as jest.Mock).not.toHaveBeenCalled();
  });

  // T6: Boundary: level 1.0 → fail → stays at 1.0 (min clamp)
  it("T6: level 1.0 fails → stays at 1.0 (min clamp)", async () => {
    (prisma.levelProfile.findUnique as jest.Mock).mockResolvedValue({
      ...DEFAULT_LEVEL_PROFILE,
      vocabulary: 1.0,
      conversation: 1.0,
      reading: 1.0,
      writing: 1.0,
    });

    // All areas fail
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([
      makeFlashcard(0, "card-bad-1"), makeFlashcard(0, "card-bad-2"),
    ]);
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([
      makeReadingAttempt(false), makeReadingAttempt(false),
    ]);
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([makeSpeakingEval(0.3)]);
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([makeWritingSubmission(0.2)]);

    const result = await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    result.changes.forEach(c => {
      expect(c.from).toBe(1.0);
      expect(c.to).toBe(1.0); // clamped at minimum
    });
  });

  // T7: pendingReviewItems ordering: failedItems appear before existing items, max 20
  it("T7: pending review items — failed vocab IDs prepend existing items, capped at 20", async () => {
    const existingItems = Array.from({ length: 18 }, (_, i) => `existing-item-${i}`);
    (prisma.levelProfile.findUnique as jest.Mock).mockResolvedValue({
      ...DEFAULT_LEVEL_PROFILE,
      pendingReviewItems: existingItems,
    });

    // Vocab fails: 2 failed cards with cardIds
    (prisma.flashcardAttempt.findMany as jest.Mock).mockResolvedValue([
      makeFlashcard(0, "new-failed-1"),
      makeFlashcard(1, "new-failed-2"),
      makeFlashcard(2, "good-card"),
    ]);
    (prisma.readingAttempt.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.speakingEvaluation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.writingSubmission.findMany as jest.Mock).mockResolvedValue([]);

    await adjustLevels(MOCK_USER_ID, MOCK_LESSON_ID);

    // Verify $transaction was called
    expect(prisma.$transaction as jest.Mock).toHaveBeenCalled();
    const txArgs = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    // First arg should be levelProfile.update
    // We need to check what data was passed to levelProfile.update
    // The transaction array: [prismaUpdatePromise, ...historyCreatePromises]
    // Since prisma.levelProfile.update is a mock, we check the mock call
    expect(prisma.levelProfile.update as jest.Mock).toHaveBeenCalled();
    const updateCall = (prisma.levelProfile.update as jest.Mock).mock.calls[0][0];
    const pendingItems = updateCall.data.pendingReviewItems;

    // New failed items should come first
    expect(pendingItems[0]).toBe("new-failed-1");
    expect(pendingItems[1]).toBe("new-failed-2");
    // Total should be capped at 20
    expect(pendingItems.length).toBeLessThanOrEqual(20);
  });
});
