export type EvaluationDomain = "conversation" | "writing" | "reading";

// ── Conversation ──────────────────────────────────────────────
export interface ConversationTurnInput {
  learnerMessage: string;
  scenarioContext: string; // brief scenario description
  turnNumber: number;
}

export interface ConversationEvaluation {
  domain: "conversation";
  overallScore: number; // 0–10
  grammarErrors: GrammarError[];
  vocabularyErrors: VocabError[];
  fluencyScore: number; // 0–10
  naturalness: number; // 0–10
  feedback: string; // 1–2 sentence summary
}

export interface GrammarError {
  original: string;
  correction: string;
  errorType: string; // e.g., "subject-verb agreement"
  explanation: string;
}

export interface VocabError {
  original: string;
  betterChoice: string;
  explanation: string;
}

// ── Writing ───────────────────────────────────────────────────
export interface WritingEvaluationInput {
  submission: string; // learner's written text
  prompt: string; // what they were asked to write
  targetGrammar: string[]; // grammar structures they were supposed to practice
  minimumWords: number;
  maximumWords: number;
}

export interface WritingEvaluation {
  domain: "writing";
  overallScore: number; // 0–10
  grammarScore: number; // 0–10
  naturalnessScore: number; // 0–10
  logicScore: number; // 0–10
  wordCount: number;
  meetsWordCount: boolean;
  usedTargetGrammar: boolean;
  strengthPoints: string[]; // 2–3 things done well
  improvementPoints: string[]; // 2–3 specific improvements
  revisedIntro?: string; // optional: a suggested better opening sentence
}

// ── Reading ───────────────────────────────────────────────────
export interface ReadingEvaluationInput {
  question: string;
  learnerAnswer: string; // free-text answer (for open-ended questions)
  correctAnswer: string; // the expected answer
  evidenceText?: string; // passage excerpt supporting the answer
}

export interface ReadingEvaluation {
  domain: "reading";
  correct: boolean;
  partialCredit: number; // 0.0–1.0
  errorType: string; // "vocabulary_gap" | "inference_failure" | "none" etc.
  feedback: string;
}
