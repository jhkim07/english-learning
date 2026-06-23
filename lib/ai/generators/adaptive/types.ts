export type AnswerOutcome = "correct" | "incorrect" | "partial";

export type ErrorType =
  | "vocabulary_gap"      // learner doesn't know the word
  | "inference_failure"   // can't infer unstated information
  | "main_idea_confusion" // misidentified the main argument
  | "detail_overlooked"   // missed a specific fact
  | "structure_confusion" // misread text organization
  | "none";               // correct answer, no error

export interface AdaptiveInput {
  passage: string;               // the original reading passage
  coreQuestion: {
    id: string;                  // e.g., "q1"
    question: string;
    options: [string, string, string, string];
    correctIndex: 0 | 1 | 2 | 3;
    questionType: string;
  };
  learnerAnswerIndex: 0 | 1 | 2 | 3;   // what the learner chose
  userLevel: number;             // 1–5
}

export interface AdaptiveQuestion {
  id: string;                   // e.g., "q1_adaptive"
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  evidenceText?: string;
  answerOutcome: AnswerOutcome;
  errorType: ErrorType;
  difficulty: number;           // original difficulty ±1
}

export interface AdaptiveGenerationInput {
  adaptiveInput: AdaptiveInput;
  studyGoal: string;
}
