process.env.AI_MOCK_MODE = "true";

import { registerSpeakingMocks } from "@/lib/ai/generators/speaking/mocks";
import { registerWritingMocks } from "@/lib/ai/generators/writing/mocks";
import { SpeakingScenarioGenerator } from "@/lib/ai/generators/speaking";
import { WritingGenerator } from "@/lib/ai/generators/writing";
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
  registerSpeakingMocks();
  registerWritingMocks();
});

describe("SpeakingScenarioGenerator (mock mode)", () => {
  it("generates a speaking scenario with required fields", async () => {
    const generator = new SpeakingScenarioGenerator();
    const result = await generator.generate(
      { userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data.openingMessage).toBeTruthy();
    expect(result.data.minimumTurns).toBe(8);
    expect(result.data.goal).toBeTruthy();
    expect(result.data.wildcard).toBeTruthy();
    expect(result.data.learnerRole).toBeTruthy();
    expect(result.data.aiRole).toBeTruthy();
  });

  it("parseLLMResponse extracts scenario from code-fence-wrapped JSON", () => {
    const generator = new SpeakingScenarioGenerator();
    const raw = `\`\`\`json\n{"category":"small_talk","title":"T","learnerRole":"R","aiRole":"A","goal":"G","wildcard":"W","openingMessage":"Hello","minimumTurns":8}\n\`\`\``;
    const scenario = generator.parseLLMResponse(raw);
    expect(scenario.openingMessage).toBe("Hello");
    expect(scenario.minimumTurns).toBe(8);
  });
});

describe("WritingGenerator (mock mode)", () => {
  it("generates a writing prompt with required fields", async () => {
    const generator = new WritingGenerator();
    const result = await generator.generate(
      { userLevel: 3, studyGoal: "비즈니스 영어" },
      MOCK_CONTEXT
    );

    expect(result.isMock).toBe(true);
    expect(result.data.prompt).toBeTruthy();
    expect(result.data.minimumWords).toBe(180);
    expect(result.data.maximumWords).toBe(220);
    expect(result.data.targetGrammar).toBeInstanceOf(Array);
    expect(result.data.targetGrammar.length).toBeGreaterThan(0);
  });

  it("parseLLMResponse extracts writing prompt from JSON", () => {
    const generator = new WritingGenerator();
    const raw = `{"prompt":"Write about X.","context":"ctx","targetGrammar":["past tense"],"minimumWords":180,"maximumWords":220,"difficulty":3}`;
    const prompt = generator.parseLLMResponse(raw);
    expect(prompt.prompt).toBe("Write about X.");
    expect(prompt.minimumWords).toBe(180);
  });
});
