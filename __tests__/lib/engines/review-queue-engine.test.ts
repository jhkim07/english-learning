import { ReviewQueueEngine } from "@/lib/engines/review-queue-engine";
import { DAILY_VOLUME } from "@/lib/engines/constants";

// Mock prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    errorRecord: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from "@/lib/db";

const MOCK_USER_ID = "test-user-123";

function makeError(id: string, domain: string, errorType: string, daysAgo = 1) {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    id,
    userId: MOCK_USER_ID,
    domain,
    errorType,
    content: { word: id },
    feedback: `Feedback for ${id}`,
    createdAt,
  };
}

describe("ReviewQueueEngine", () => {
  let engine: ReviewQueueEngine;

  beforeEach(() => {
    engine = new ReviewQueueEngine();
    jest.clearAllMocks();
  });

  it("returns empty result when no error records exist", async () => {
    (prisma.errorRecord.findMany as jest.Mock).mockResolvedValue([]);

    const result = await engine.getReviewQueue(MOCK_USER_ID, 5);

    expect(result.items).toHaveLength(0);
    expect(result.totalErrors).toBe(0);
    expect(result.hasEnoughItems).toBe(false);
  });

  it("returns up to DAILY_VOLUME.REVIEW_CARDS items", async () => {
    const errors = Array.from({ length: 15 }, (_, i) =>
      makeError(`err-${i}`, "vocabulary", "spelling", i + 1)
    );
    (prisma.errorRecord.findMany as jest.Mock).mockResolvedValue(errors);

    const result = await engine.getReviewQueue(MOCK_USER_ID, 5);

    expect(result.items.length).toBeLessThanOrEqual(DAILY_VOLUME.REVIEW_CARDS);
    expect(result.totalErrors).toBe(15);
  });

  it("marks hasEnoughItems true when 8+ unique errors exist", async () => {
    const errors = Array.from({ length: 10 }, (_, i) =>
      makeError(`err-${i}`, "reading", "inference_failure", i + 1)
    );
    (prisma.errorRecord.findMany as jest.Mock).mockResolvedValue(errors);

    const result = await engine.getReviewQueue(MOCK_USER_ID, 5);

    expect(result.hasEnoughItems).toBe(true);
    expect(result.items).toHaveLength(DAILY_VOLUME.REVIEW_CARDS);
  });

  it("deduplicates items with identical content", async () => {
    // 3 errors with same content + 8 unique errors = 11 total, 9 unique
    const dupeErrors = [
      makeError("dup-1", "vocabulary", "spelling", 1),
      makeError("dup-2", "vocabulary", "spelling", 2),
      makeError("dup-3", "vocabulary", "spelling", 3),
    ].map((e) => ({ ...e, content: { word: "same-word" } }));

    const uniqueErrors = Array.from({ length: 8 }, (_, i) =>
      makeError(`unique-${i}`, "grammar", "tense", i + 4)
    );

    (prisma.errorRecord.findMany as jest.Mock).mockResolvedValue([...dupeErrors, ...uniqueErrors]);

    const result = await engine.getReviewQueue(MOCK_USER_ID, 5);

    // Should not contain "same-word" more than once
    const sameWordItems = result.items.filter(
      (item) => (item.content as { word: string }).word === "same-word"
    );
    expect(sameWordItems.length).toBeLessThanOrEqual(1);
  });

  it("isDuplicateVocab returns false when no similar vocabulary exists", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const embedding = [0.1, 0.2, 0.3];
    const result = await engine.isDuplicateVocab(embedding, MOCK_USER_ID, 0.15);

    expect(result).toBe(false);
  });

  it("isDuplicateVocab returns true when similarity exceeds threshold", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ distance: 0.9 }]);

    const embedding = [0.1, 0.2, 0.3];
    // threshold = 0.15, so similarity threshold = 1 - 0.15 = 0.85
    // distance = 0.9 >= 0.85 should return true
    const result = await engine.isDuplicateVocab(embedding, MOCK_USER_ID, 0.15);

    expect(result).toBe(true);
  });

  it("sorts items by priority descending (older errors have higher priority)", async () => {
    // Create errors with different ages: 10 days ago, 5 days ago, 1 day ago
    // Older errors should have higher priority
    const oldError = makeError("old-err", "vocabulary", "spelling", 10);
    const midError = makeError("mid-err", "vocabulary", "spelling", 5);
    const recentError = makeError("recent-err", "vocabulary", "spelling", 1);

    (prisma.errorRecord.findMany as jest.Mock).mockResolvedValue([
      recentError,
      oldError,
      midError,
    ]);

    const result = await engine.getReviewQueue(MOCK_USER_ID, 5);

    expect(result.items.length).toBeGreaterThan(0);
    // First item should have higher priority than last item
    const firstPriority = result.items[0].priority;
    const lastPriority = result.items[result.items.length - 1].priority;
    expect(firstPriority).toBeGreaterThanOrEqual(lastPriority);
  });
});
