"use client";

import { FlashCard } from "./flash-card";
import { SwipeButtons } from "./swipe-buttons";
import { useFlashcardSession } from "./use-flashcard-session";
import { useFlashcardKeyboard } from "./use-flashcard-keyboard";
import type { FlashcardData, FlashcardSessionResult } from "./types";

interface Props {
  cards: FlashcardData[];
  lessonId: string;
  onComplete: (result: FlashcardSessionResult) => void;
}

export function FlashcardDeck({ cards, lessonId, onComplete }: Props) {
  const { currentCard, currentIndex, totalCards, isFlipped, isComplete, result, flip, swipe } =
    useFlashcardSession(cards);

  useFlashcardKeyboard({
    onFlip: flip,
    onSwipeRight: () => swipe("right"),
    onSwipeLeft: () => swipe("left"),
    isFlipped,
  });

  if (isComplete) {
    onComplete(result);
    return null;
  }

  const progress = Math.round((currentIndex / totalCards) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Card {currentIndex + 1} of {totalCards}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <FlashCard card={currentCard} isFlipped={isFlipped} onFlip={flip} />

      {/* Swipe controls */}
      <div className="space-y-2">
        <p className="text-center text-xs text-muted-foreground">
          {isFlipped ? "How did you do?" : "Tap card to see answer, then:"}
        </p>
        <SwipeButtons onSwipe={swipe} disabled={!isFlipped} />
        <p className="text-xs text-muted-foreground text-center mt-2">
          Space/Enter to flip · ← / → to rate
        </p>
      </div>
    </div>
  );
}
