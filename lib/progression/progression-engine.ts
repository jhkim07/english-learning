import { prisma } from "@/lib/db";

export type ProgressionDecisionType = "promote" | "stay" | "remediation";

export interface ProgressionResult {
  decision: ProgressionDecisionType;
  currentLevel: number;
  nextLevel: number | null;
  reason: string;
  score: number;
}

export const PROGRESSION_THRESHOLDS = {
  PROMOTE: 0.75, // >=75% → promote
  STAY: 0.60, // 60–74% → stay
  // <60% → remediation
} as const;

export class ProgressionEngine {
  async evaluateProgression(
    userId: string,
    score: number,
    currentLevel: number
  ): Promise<ProgressionResult> {
    let decision: ProgressionDecisionType;
    let nextLevel: number | null = null;
    let reason: string;

    if (score >= PROGRESSION_THRESHOLDS.PROMOTE) {
      decision = "promote";
      nextLevel = Math.min(currentLevel + 1, 5); // cap at level 5
      reason = `Score ${Math.round(score * 100)}% exceeds promotion threshold (75%)`;
    } else if (score >= PROGRESSION_THRESHOLDS.STAY) {
      decision = "stay";
      reason = `Score ${Math.round(score * 100)}% meets retention threshold (60–74%)`;
    } else {
      decision = "remediation";
      reason = `Score ${Math.round(score * 100)}% below retention threshold (60%). Remediation recommended.`;
    }

    // Persist decision
    await prisma.progressionDecision.create({
      data: {
        userId,
        decision,
        currentLevel,
        nextLevel,
        reason,
      },
    });

    // If promoting, update UserProfile level
    if (decision === "promote" && nextLevel !== null) {
      await prisma.userProfile.update({
        where: { userId },
        data: { currentLevel: nextLevel },
      });
    }

    return { decision, currentLevel, nextLevel, reason, score };
  }

  async saveWeeklyAssessment(
    userId: string,
    weekNumber: number,
    correctItems: number,
    totalItems: number
  ): Promise<void> {
    await prisma.weeklyAssessment.create({
      data: {
        userId,
        weekNumber,
        score: totalItems > 0 ? correctItems / totalItems : 0,
        totalItems,
        correctItems,
      },
    });
  }

  async saveMonthlyExam(
    userId: string,
    correctItems: number,
    totalItems: number
  ): Promise<void> {
    await prisma.monthlyExam.create({
      data: {
        userId,
        score: totalItems > 0 ? correctItems / totalItems : 0,
        totalItems,
        correctItems,
      },
    });
  }
}
