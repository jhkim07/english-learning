export type ImageSource = "unsplash" | "dalle3" | "text_fallback";

export interface ImageResult {
  url: string;              // signed R2 URL (or empty string for text fallback)
  altText: string;          // REQUIRED even for image results (WCAG)
  source: ImageSource;
  width: number;
  height: number;
  storagePath: string;      // R2 key (e.g., "vocab/user-id/study-day/word-hash.jpg")
  generatedAt: Date;
}

export interface ImageGenerationInput {
  imagePrompt: string;       // from VocabularyCard.imagePrompt
  word: string;              // used in alt text + file naming
  userId: string;
  studyDay: number;
}
