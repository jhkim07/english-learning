export interface PlanningContext {
  userId: string;
  studyDay?: number;           // optional — level-based sessions may not have a study day
  curriculumVersion?: number;  // optional — level-based sessions have no curriculum
  userLevel: number;           // keep for backward compat
  studyGoal: string;
  previousWords: string[];
  previousCategories: string[];
  yesterdayErrors: {
    errorType: string;
    domain: string;
  }[];
  levelProfile?: {             // NEW — optional for backward compat
    vocabulary: number;
    conversation: number;
    reading: number;
    writing: number;
    pendingReviewItems: string[];
  };
}

export interface PlannerResult {
  dailyLessonId: string;
  vocabArtifactIds: string[];
  sentenceArtifactIds: string[];
  readingArtifactId: string;
  speakingArtifactId: string;
  speakingArtifactIds: string[];
  writingArtifactId: string;
  imageArtifactIds: string[];
  generatedAt: Date;
}
