export type FlashcardType =
  | "vocab_front"
  | "vocab_back"
  | "sentence_blank"
  | "sentence_answer"
  | "image_front"
  | "image_back"
  | "review_vocab"
  | "review_sentence"
  | "review_image";

export type SwipeDirection = "left" | "right";

export interface FlashcardData {
  id: string;
  type: FlashcardType;
  front: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    badge?: string;
  };
  back: {
    title: string;
    subtitle?: string;
    detail?: string;
    badge?: string;
  };
}

export interface FlashcardAttempt {
  cardId: string;
  correct: boolean;
  timeSpentMs: number;
}

export interface FlashcardSessionResult {
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  attempts: FlashcardAttempt[];
}
