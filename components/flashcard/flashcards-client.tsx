"use client";

import { useState } from "react";
import { FlashcardDeck } from "./flashcard-deck";
import { buildFlashcards } from "./build-flashcards";
import type { FlashcardSessionResult } from "./types";
import { Button } from "@/components/ui/button";

interface ArtifactRecord {
  artifactId: string;
  artifactType: string;
  content: Record<string, unknown>;
}

interface Props {
  lessonId: string;
  artifacts: ArtifactRecord[];
}

export function FlashcardsClient({ lessonId, artifacts }: Props) {
  const [sessionResult, setSessionResult] = useState<FlashcardSessionResult | null>(null);
  const cards = buildFlashcards(artifacts);

  if (sessionResult) {
    const pct = Math.round((sessionResult.correctCount / sessionResult.totalCards) * 100);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <p className="text-4xl font-bold text-primary">{pct}%</p>
        <p className="text-muted-foreground">
          {sessionResult.correctCount} correct out of {sessionResult.totalCards} cards
        </p>
        <Button asChild className="w-full">
          <a href={`/lesson/${lessonId}`}>Back to Lesson</a>
        </Button>
      </div>
    );
  }

  return (
    <FlashcardDeck
      cards={cards}
      lessonId={lessonId}
      onComplete={setSessionResult}
    />
  );
}
