export interface SentenceCard {
  sentence: string;             // Full sentence with the missing word REPLACED by ___
  answer: string;               // The correct word/phrase to fill the blank
  hint: string;                 // Grammar or contextual clue (e.g., "past tense verb")
  explanation: string;          // Why this word fits; vocabulary note
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface SentenceGenerationInput {
  count: number;                // always 4 for daily lessons
  userLevel: number;            // 1–5
  studyGoal: string;
  relatedWords?: string[];      // vocab words from today's lesson (for cross-domain linking)
}
