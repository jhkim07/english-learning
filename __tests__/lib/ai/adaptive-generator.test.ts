process.env.AI_MOCK_MODE = "true";

import { registerAdaptiveMocks } from "@/lib/ai/generators/adaptive/mocks";
import { AdaptiveQuestionGenerator } from "@/lib/ai/generators/adaptive";
import type { GenerationContext } from "@/lib/ai/types";

const MOCK_CONTEXT: GenerationContext = {
  userId: "test-user",
  studyDay: 1,
  curriculumVersion: 1,
  difficultyLevel: 3,
  userLevel: 3,
  studyGoal: "비즈니스 영어",
};

const MOCK_PASSAGE = "The global shift to remote work has transformed organizations...";

const CORE_QUESTION = {
  id: "q1",
  question: "What is the main idea of this passage?",
  options: [
    "Remote work was invented during 2020",
    "Remote work has both benefits and challenges",
    "All companies should switch to remote",
    "Technology is the only obstacle",
  ] as [string, string, string, string],
  correctIndex: 1 as 0 | 1 | 2 | 3,
  questionType: "main_idea",
};

describe("AdaptiveQuestionGenerator (mock mode)", () => {
  beforeAll(() => {
    registerAdaptiveMocks();
  });

  it("generates a harder follow-up when learner answers correctly", async () => {
    const generator = new AdaptiveQuestionGenerator();
    const result = await generator.generate(
      {
        adaptiveInput: {
          passage: MOCK_PASSAGE,
          coreQuestion: CORE_QUESTION,
          learnerAnswerIndex: 1,  // correct (same as correctIndex)
          userLevel: 3,
        },
        studyGoal: "비즈니스 영어",
      },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data.answerOutcome).toBe("correct");
    expect(result.data.errorType).toBe("none");
    expect(result.data.difficulty).toBe(4);  // harder follow-up
    expect(result.data.id).toMatch(/_adaptive$/);
  });

  it("generates a targeted follow-up when learner answers incorrectly", async () => {
    const generator = new AdaptiveQuestionGenerator();
    const result = await generator.generate(
      {
        adaptiveInput: {
          passage: MOCK_PASSAGE,
          coreQuestion: CORE_QUESTION,
          learnerAnswerIndex: 0,  // incorrect
          userLevel: 3,
        },
        studyGoal: "비즈니스 영어",
      },
      MOCK_CONTEXT
    );

    expect(result.data.answerOutcome).toBe("incorrect");
    expect(result.data.errorType).not.toBe("none");
    expect(result.data.difficulty).toBe(2);  // easier follow-up targeting the error
  });

  it("adaptive question has required fields", async () => {
    const generator = new AdaptiveQuestionGenerator();
    const result = await generator.generate(
      {
        adaptiveInput: {
          passage: MOCK_PASSAGE,
          coreQuestion: CORE_QUESTION,
          learnerAnswerIndex: 1,
          userLevel: 3,
        },
        studyGoal: "비즈니스 영어",
      },
      MOCK_CONTEXT
    );

    expect(result.data.question).toBeTruthy();
    expect(result.data.options).toHaveLength(4);
    expect(result.data.correctIndex).toBeGreaterThanOrEqual(0);
    expect(result.data.correctIndex).toBeLessThanOrEqual(3);
    expect(result.data.explanation).toBeTruthy();
  });
});
