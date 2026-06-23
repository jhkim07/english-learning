export interface PlanningContext {
  userId: string;
  studyDay: number;
  curriculumVersion: number;
  userLevel: number;
  studyGoal: string;
  previousWords: string[];
  previousCategories: string[];
  yesterdayErrors: {
    errorType: string;
    domain: string;
  }[];
}

export interface PlannerResult {
  dailyLessonId: string;
  vocabArtifactIds: string[];
  sentenceArtifactIds: string[];
  readingArtifactId: string;
  speakingArtifactId: string;
  writingArtifactId: string;
  imageArtifactIds: string[];
  generatedAt: Date;
}
