export interface VocabularyCard {
  word: string;
  definition: string;
  exampleSentence: string;
  collocations: [string, string, string]; // exactly 3
  mnemonic: string;
  imagePrompt: string;
}

export interface VocabularyGenerationInput {
  count: number; // always 12 for daily lessons
  userLevel: number; // 1–5
  studyGoal: string;
  previousWords?: string[]; // words already seen by this user (avoid repetition)
}
