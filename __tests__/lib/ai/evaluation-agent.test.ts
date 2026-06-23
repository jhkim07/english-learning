process.env.AI_MOCK_MODE = "true";

import { EvaluationAgent } from "@/lib/ai/evaluation";

describe("EvaluationAgent (mock mode)", () => {
  let agent: EvaluationAgent;

  beforeEach(() => {
    agent = new EvaluationAgent();
  });

  it("evaluates a conversation turn and returns ConversationEvaluation", async () => {
    const result = await agent.evaluateConversationTurn({
      learnerMessage: "I am very exciting about this opportunity.",
      scenarioContext: "Job interview at a tech startup",
      turnNumber: 1,
    });

    expect(result.domain).toBe("conversation");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(10);
    expect(Array.isArray(result.grammarErrors)).toBe(true);
    expect(Array.isArray(result.vocabularyErrors)).toBe(true);
    expect(result.feedback).toBeTruthy();
  });

  it("evaluates a writing submission and returns WritingEvaluation", async () => {
    const submission =
      "Dear Team, I am writing to inform you about our new hybrid work policy. " +
      "Starting next month, employees will work from the office three days per week. " +
      "This policy was designed to balance flexibility with collaboration. " +
      "Remote days will be Monday and Friday. Please let me know if you have questions. Best regards.";

    const result = await agent.evaluateWriting({
      submission,
      prompt: "Write an email about the hybrid work policy",
      targetGrammar: ["passive voice", "formal email structure"],
      minimumWords: 180,
      maximumWords: 220,
    });

    expect(result.domain).toBe("writing");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.grammarScore).toBeDefined();
    expect(result.naturalnessScore).toBeDefined();
    expect(result.logicScore).toBeDefined();
    expect(Array.isArray(result.strengthPoints)).toBe(true);
    expect(Array.isArray(result.improvementPoints)).toBe(true);
  });

  it("evaluates a reading answer and returns ReadingEvaluation", async () => {
    const result = await agent.evaluateReadingAnswer({
      question: "What is the main advantage of remote work for companies?",
      learnerAnswer:
        "Companies can hire people from anywhere in the world.",
      correctAnswer:
        "Access to global talent without geographic constraints",
      evidenceText:
        "Companies can recruit talent without geographic constraints",
    });

    expect(result.domain).toBe("reading");
    expect(typeof result.correct).toBe("boolean");
    expect(result.partialCredit).toBeGreaterThanOrEqual(0);
    expect(result.partialCredit).toBeLessThanOrEqual(1);
    expect(result.feedback).toBeTruthy();
  });
});
