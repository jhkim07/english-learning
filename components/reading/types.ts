import type { ReadingQuestion } from "@/lib/ai/generators/reading";
import type { AdaptiveQuestion } from "@/lib/ai/generators/adaptive";

export interface QuestionWithState {
  question: ReadingQuestion | AdaptiveQuestion;
  isAdaptive: boolean;
  answered: boolean;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  adaptiveLoading?: boolean;
}

export interface ReadingSessionState {
  currentQuestionIndex: number;
  questions: QuestionWithState[];
  isComplete: boolean;
  score: number; // 0–12
}
