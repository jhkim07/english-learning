export interface WritingPrompt {
  prompt: string;              // the task description shown to learner
  context: string;             // background info (optional, provides writing context)
  targetGrammar: string[];     // grammar structures to practice (e.g., ["passive voice", "conditional"])
  minimumWords: 180;           // always 180
  maximumWords: 220;           // always 220
  sampleOutline?: string;      // optional structure hint
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface WritingGenerationInput {
  userLevel: number;           // 1–5
  studyGoal: string;
}
