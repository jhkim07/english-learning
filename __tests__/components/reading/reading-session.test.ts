import { buildInitialReadingSession } from "@/components/reading/build-reading-session";

// Minimal types inline for test
interface MockQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: number;
}

const MOCK_QUESTIONS: MockQuestion[] = Array.from({ length: 6 }, (_, i) => ({
  id: `q${i + 1}`,
  question: `Question ${i + 1}?`,
  options: ["A", "B", "C", "D"],
  correctIndex: 0,
  explanation: "Because A.",
  difficulty: 3,
}));

describe("buildInitialReadingSession", () => {
  it("initializes 6 questions with unanswered state", () => {
    const session = buildInitialReadingSession(MOCK_QUESTIONS as any);
    expect(session.questions).toHaveLength(6);
    expect(session.questions.every((q) => !q.answered)).toBe(true);
    expect(session.score).toBe(0);
    expect(session.isComplete).toBe(false);
  });

  it("sets currentQuestionIndex to 0", () => {
    const session = buildInitialReadingSession(MOCK_QUESTIONS as any);
    expect(session.currentQuestionIndex).toBe(0);
  });
});
