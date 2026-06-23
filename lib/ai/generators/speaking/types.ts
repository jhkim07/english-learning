export type SpeakingCategory =
  | "job_interview"
  | "business_meeting"
  | "customer_service"
  | "negotiation"
  | "small_talk"
  | "academic_discussion"
  | "travel"
  | "daily_life";

export interface SpeakingScenario {
  category: SpeakingCategory;
  title: string;
  learnerRole: string;         // e.g., "a software engineer interviewing for a startup"
  aiRole: string;              // e.g., "a senior hiring manager"
  goal: string;                // what the learner must accomplish in the conversation
  wildcard: string;            // unexpected twist mid-conversation (e.g., "the interviewer mentions a salary cut")
  openingMessage: string;      // AI's first message to start the conversation
  minimumTurns: number;        // always 8
}

export interface SpeakingGenerationInput {
  userLevel: number;           // 1–5
  studyGoal: string;
  previousCategories?: SpeakingCategory[];  // avoid repeating
}
