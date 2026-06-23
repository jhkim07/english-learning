process.env.AI_MOCK_MODE = "true";

import { registerSentenceMocks } from "@/lib/ai/generators/sentence/mocks";
import { registerReadingMocks } from "@/lib/ai/generators/reading/mocks";
import { SentenceCardGenerator } from "@/lib/ai/generators/sentence";
import { ReadingGenerator } from "@/lib/ai/generators/reading";
import { ValidationAgent } from "@/lib/ai/validation-agent";
import type { GenerationContext } from "@/lib/ai/types";

const MOCK_CONTEXT: GenerationContext = {
  userId: "test-user",
  studyDay: 1,
  curriculumVersion: 1,
  difficultyLevel: 3,
  userLevel: 3,
  studyGoal: "비즈니스 영어",
};

beforeAll(() => {
  registerSentenceMocks();
  registerReadingMocks();
});

describe("SentenceCardGenerator (mock mode)", () => {
  it("generates 4 sentence cards in mock mode", async () => {
    const generator = new SentenceCardGenerator();
    const result = await generator.generate(
      { count: 4, userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data[0]).toMatchObject({
      sentence: expect.stringContaining("___"),
      answer: expect.any(String),
      hint: expect.any(String),
      explanation: expect.any(String),
      difficulty: expect.any(Number),
    });
  });

  it("parseLLMResponse handles code fence-wrapped JSON", () => {
    const generator = new SentenceCardGenerator();
    const raw = `\`\`\`json\n[{"sentence":"She ___ the project.","answer":"led","hint":"past tense","explanation":"Led means guided.","difficulty":2}]\n\`\`\``;
    const cards = generator.parseLLMResponse(raw);
    expect(cards[0].sentence).toContain("___");
    expect(cards[0].answer).toBe("led");
  });
});

describe("ReadingGenerator (mock mode)", () => {
  it("generates a reading passage with 6 questions in mock mode", async () => {
    const generator = new ReadingGenerator();
    const result = await generator.generate(
      { userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data.passage).toBeTruthy();
    expect(result.data.questions).toHaveLength(6);
    expect(result.data.wordCount).toBeGreaterThanOrEqual(400);
    expect(result.data.wordCount).toBeLessThanOrEqual(500);  // some slack for mock
  });

  it("each reading question has required fields", async () => {
    const generator = new ReadingGenerator();
    const result = await generator.generate(
      { userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    for (const q of result.data.questions) {
      expect(q.id).toMatch(/^q[1-6]$/);
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.explanation).toBeTruthy();
    }
  });
});

describe("ValidationAgent + generators (mock mode)", () => {
  it("validates sentence cards and approves", async () => {
    const generator = new SentenceCardGenerator();
    const agent = new ValidationAgent();

    const result = await generator.generate(
      { count: 4, userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );
    const validation = await agent.validate("sentence", result.data, 3);

    expect(validation.approved).toBe(true);
    expect(validation.score).toBeGreaterThanOrEqual(0.9);
  });

  it("validates reading passage and approves", async () => {
    const generator = new ReadingGenerator();
    const agent = new ValidationAgent();

    const result = await generator.generate(
      { userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );
    const validation = await agent.validate("reading", result.data, 3);

    expect(validation.approved).toBe(true);
  });
});
