export interface GenerationResult<T> {
  data: T;
  modelVersion: string;
  promptVersion: string;
  generationSeed: string;
  generatedAt: Date;
  isMock: boolean;
}

export interface GenerationContext {
  userId: string;
  studyDay: number;
  curriculumVersion: number;
  difficultyLevel: number;
  userLevel: number; // 1–5 from UserProfile.currentLevel
  studyGoal: string;
}

export interface PromptTemplate {
  version: string;
  systemPrompt: string;
  userPromptTemplate: string; // may contain {variable} placeholders
  responseSchema?: object; // JSON schema for output validation
}
