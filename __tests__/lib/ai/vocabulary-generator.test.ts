import { registerVocabularyMocks } from "@/lib/ai/generators/vocabulary/mocks";
import { VocabularyGenerator } from "@/lib/ai/generators/vocabulary";
import type { GenerationContext } from "@/lib/ai/types";

// Set mock mode before imports are processed
process.env.AI_MOCK_MODE = "true";

const MOCK_CONTEXT: GenerationContext = {
  userId: "test-user",
  studyDay: 1,
  curriculumVersion: 1,
  difficultyLevel: 3,
  userLevel: 3,
  studyGoal: "비즈니스 영어",
};

describe("VocabularyGenerator (mock mode)", () => {
  beforeAll(() => {
    registerVocabularyMocks();
  });

  it("generates 12 vocabulary cards in mock mode", async () => {
    const generator = new VocabularyGenerator();
    const result = await generator.generate(
      { count: 12, userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data).toHaveLength(12);
    expect(result.data[0]).toMatchObject({
      word: expect.any(String),
      definition: expect.any(String),
      exampleSentence: expect.any(String),
      collocations: expect.arrayContaining([expect.any(String)]),
      mnemonic: expect.any(String),
      imagePrompt: expect.any(String),
    });
  });

  it("returns mock metadata with correct prompt version", async () => {
    const generator = new VocabularyGenerator();
    const result = await generator.generate(
      { count: 12, userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.modelVersion).toBe("mock-v1");
    expect(result.promptVersion).toBe("v1.0.0");
    expect(result.isMock).toBe(true);
  });

  it("parseLLMResponse extracts cards from JSON array", () => {
    const generator = new VocabularyGenerator();
    const raw = JSON.stringify([
      {
        word: "test",
        definition: "a definition",
        exampleSentence: "a sentence",
        collocations: ["a", "b", "c"],
        mnemonic: "a mnemonic",
        imagePrompt: "a prompt",
      },
    ]);

    const cards = generator.parseLLMResponse(raw);
    expect(cards).toHaveLength(1);
    expect(cards[0].word).toBe("test");
  });

  it("parseLLMResponse handles markdown code fences", () => {
    const generator = new VocabularyGenerator();
    const raw = `Here are the cards:\n\`\`\`json\n[{"word":"test","definition":"d","exampleSentence":"s","collocations":["a","b","c"],"mnemonic":"m","imagePrompt":"ip"}]\n\`\`\``;

    const cards = generator.parseLLMResponse(raw);
    expect(cards[0].word).toBe("test");
  });
});

describe("VocabularyGenerator — ValidationAgent (mock mode)", () => {
  it("validates vocabulary cards in mock mode and approves", async () => {
    const { ValidationAgent } = await import("@/lib/ai/validation-agent");
    registerVocabularyMocks();

    const agent = new ValidationAgent();
    const generator = new VocabularyGenerator();
    const result = await generator.generate(
      { count: 3, userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    const validation = await agent.validate("vocabulary", result.data, 3);
    expect(validation.approved).toBe(true);
    expect(validation.score).toBeGreaterThan(0.9);
    expect(validation.issues).toHaveLength(0);
  });
});
