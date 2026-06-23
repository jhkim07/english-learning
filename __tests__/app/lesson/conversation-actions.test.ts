process.env.AI_MOCK_MODE = "true";

import { sendConversationTurn } from "@/app/(app)/lesson/[lessonId]/conversation/actions";

describe("sendConversationTurn (mock mode)", () => {
  it("returns ai reply and evaluation score in mock mode", async () => {
    const result = await sendConversationTurn({
      lessonId: "lesson-1",
      userMessage: "I am very exciting about this opportunity.",
      scenarioContext: "a hiring manager at a tech company",
      turnHistory: [
        { role: "assistant", content: "Tell me about yourself." },
      ],
      turnNumber: 1,
    });

    expect(result.aiReply).toBeTruthy();
    expect(typeof result.evaluationScore).toBe("number");
    expect(result.evaluationScore).toBeGreaterThanOrEqual(0);
    expect(result.evaluationScore).toBeLessThanOrEqual(10);
  });
});
