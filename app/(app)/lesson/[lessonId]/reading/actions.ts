"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";
import { AdaptiveQuestionGenerator } from "@/lib/ai/generators/adaptive";
import { ValidationAgent } from "@/lib/ai/validation-agent";
import { isMockMode } from "@/lib/ai/mock-registry";
import { registerAdaptiveMocks } from "@/lib/ai/generators/adaptive/mocks";
import type { AdaptiveQuestion } from "@/lib/ai/generators/adaptive";

// Register mocks at module level for mock mode
if (isMockMode()) {
  registerAdaptiveMocks();
}

interface GenerateAdaptiveInput {
  lessonId: string;
  coreQuestionId: string;
  learnerAnswerIndex: number;
  passage: string;
}

export async function generateAdaptiveQuestion(
  input: GenerateAdaptiveInput
): Promise<AdaptiveQuestion> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { currentLevel: true, studyGoal: true },
  });

  const userLevel = profile?.currentLevel ?? 3;
  const studyGoal = profile?.studyGoal ?? "general";

  const generator = new AdaptiveQuestionGenerator();

  const result = await generator.generate(
    {
      adaptiveInput: {
        coreQuestion: {
          id: input.coreQuestionId,
          question: "Core question",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          questionType: "detail",
        },
        learnerAnswerIndex: input.learnerAnswerIndex as 0 | 1 | 2 | 3,
        passage: input.passage,
        userLevel,
      },
      studyGoal,
    },
    {
      userId,
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: userLevel,
      userLevel,
      studyGoal,
    }
  );

  // Run through ValidationAgent — log failures but don't block learner (MVP rule)
  try {
    const validator = new ValidationAgent();
    const validationResult = await validator.validate("reading", result.data, userLevel);
    if (!validationResult.approved) {
      console.warn("[adaptive] ValidationAgent did not approve question:", validationResult);
    }
  } catch (err) {
    console.error("[adaptive] ValidationAgent error (non-blocking):", err);
  }

  return result.data;
}
