import { prisma } from "@/lib/db";
import { DAILY_VOLUME } from "./constants";

export interface ReviewItem {
  errorRecordId: string;
  userId: string;
  domain: string;
  errorType: string;
  content: unknown;
  feedback: string;
  priority: number;          // higher = show sooner
  createdAt: Date;
}

export interface ReviewQueueResult {
  items: ReviewItem[];
  totalErrors: number;
  hasEnoughItems: boolean;
}

export class ReviewQueueEngine {
  async getReviewQueue(userId: string, studyDay: number): Promise<ReviewQueueResult> {
    // Fetch all error records for this user
    const allErrors = await prisma.errorRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (allErrors.length === 0) {
      return { items: [], totalErrors: 0, hasEnoughItems: false };
    }

    // Priority = recency boost + frequency boost
    // Higher priority = show sooner
    const errorFrequency = new Map<string, number>();

    for (const err of allErrors) {
      const contentKey = JSON.stringify(err.content);
      errorFrequency.set(contentKey, (errorFrequency.get(contentKey) ?? 0) + 1);
    }

    const scoredErrors = allErrors.map((err) => {
      const contentKey = JSON.stringify(err.content);
      const frequency = errorFrequency.get(contentKey) ?? 1;
      // Age-based priority: older errors that haven't been reviewed get higher priority
      const daysSinceError = (Date.now() - err.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const agePriority = Math.min(daysSinceError / 7, 5); // cap at 5
      const priority = frequency * 2 + agePriority;

      return {
        errorRecordId: err.id,
        userId: err.userId,
        domain: err.domain,
        errorType: err.errorType,
        content: err.content,
        feedback: err.feedback,
        priority,
        createdAt: err.createdAt,
      };
    });

    // Sort by priority descending, deduplicate by contentKey
    const seen = new Set<string>();
    const deduped = scoredErrors
      .sort((a, b) => b.priority - a.priority)
      .filter((item) => {
        const key = JSON.stringify(item.content);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const selected = deduped.slice(0, DAILY_VOLUME.REVIEW_CARDS);

    return {
      items: selected,
      totalErrors: allErrors.length,
      hasEnoughItems: selected.length === DAILY_VOLUME.REVIEW_CARDS,
    };
  }

  async isDuplicateVocab(
    embedding: number[],
    userId: string,
    threshold = 0.15
  ): Promise<boolean> {
    // Use pgvector cosine distance to check for near-duplicates
    // Returns true if a similar word already exists in user's learned words
    const result = await prisma.$queryRaw<{ distance: number }[]>`
      SELECT 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS distance
      FROM "AIArtifact"
      WHERE "userId" = ${userId}
        AND "artifactType" = 'VOCABULARY_CARD'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT 1
    `;

    if (result.length === 0) return false;
    return result[0].distance >= (1 - threshold);
  }
}
