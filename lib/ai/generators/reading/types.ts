export type QuestionType = "main_idea" | "detail" | "inference" | "vocabulary" | "structure" | "author_purpose";

export interface ReadingQuestion {
  id: string;                   // "q1"–"q6" for core questions
  questionType: QuestionType;
  question: string;
  options: [string, string, string, string];  // exactly 4 choices
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;          // why the correct answer is correct
  evidenceText?: string;        // exact quote from passage supporting the answer
}

export interface ReadingPassage {
  title: string;
  passage: string;              // 400–450 words
  wordCount: number;
  topic: string;
  questions: ReadingQuestion[]; // exactly 6 core questions
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface ReadingGenerationInput {
  userLevel: number;            // 1–5
  studyGoal: string;
  topic?: string;               // if not provided, generator chooses a topic
}
