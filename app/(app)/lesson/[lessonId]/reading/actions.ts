"use server";

import { AdaptiveQuestionGenerator } from "@/lib/ai/generators/adaptive";
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
        userLevel: 3,
      },
      studyGoal: "비즈니스 영어",
    },
    {
      userId: "user",
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: 3,
      userLevel: 3,
      studyGoal: "비즈니스 영어",
    }
  );

  return result.data;
}
