import { registerMock } from "@/lib/ai/mock-registry";
import type { AdaptiveQuestion } from "./types";

const MOCK_CORRECT_ADAPTIVE: AdaptiveQuestion = {
  id: "q1_adaptive",
  question: "The passage suggests that the most significant long-term challenge of remote work is:",
  options: [
    "Higher technology infrastructure costs",
    "Maintaining organizational culture across distributed teams",
    "Reduced employee salaries due to location flexibility",
    "Slower internet connections in home offices",
  ],
  correctIndex: 1,
  explanation: "While multiple challenges exist, the passage emphasizes culture and collaboration as foundational long-term concerns.",
  evidenceText: "New employees, in particular, struggle to absorb company culture and build relationships without physical proximity.",
  answerOutcome: "correct",
  errorType: "none",
  difficulty: 4,
};

const MOCK_INCORRECT_ADAPTIVE: AdaptiveQuestion = {
  id: "q1_adaptive",
  question: "What does the author mean by 'replicate' in paragraph 3?",
  options: [
    "To eliminate virtual communication",
    "To copy or reproduce exactly",
    "To improve upon an original",
    "To analyze and critique",
  ],
  correctIndex: 1,
  explanation: "The learner may have confused 'replicate' with 'imitate' or missed that it means to reproduce. Context: difficult to replicate informal conversations.",
  evidenceText: "The informal conversations that spark creative ideas — the hallway encounters and spontaneous coffee meetings — are difficult to replicate virtually.",
  answerOutcome: "incorrect",
  errorType: "vocabulary_gap",
  difficulty: 2,
};

export function registerAdaptiveMocks(): void {
  registerMock("adaptive:correct", MOCK_CORRECT_ADAPTIVE);
  registerMock("adaptive:incorrect", MOCK_INCORRECT_ADAPTIVE);
}
