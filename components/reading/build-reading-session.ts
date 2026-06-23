import type { ReadingQuestion } from "@/lib/ai/generators/reading";
import type { ReadingSessionState } from "./types";

export function buildInitialReadingSession(questions: ReadingQuestion[]): ReadingSessionState {
  return {
    currentQuestionIndex: 0,
    questions: questions.map((q) => ({
      question: q,
      isAdaptive: false,
      answered: false,
      selectedIndex: null,
      isCorrect: null,
    })),
    isComplete: false,
    score: 0,
  };
}
