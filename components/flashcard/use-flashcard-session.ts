"use client";

import { useState, useCallback } from "react";
import type { FlashcardData, FlashcardAttempt, FlashcardSessionResult, SwipeDirection } from "./types";

export function useFlashcardSession(cards: FlashcardData[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [attempts, setAttempts] = useState<FlashcardAttempt[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = cards[currentIndex];

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const swipe = useCallback(
    (direction: SwipeDirection) => {
      const timeSpentMs = Date.now() - startTime;
      const correct = direction === "right";

      setAttempts((prev) => [
        ...prev,
        { cardId: currentCard.id, correct, timeSpentMs },
      ]);

      if (currentIndex + 1 >= cards.length) {
        setIsComplete(true);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setStartTime(Date.now());
    },
    [currentCard, currentIndex, cards.length, startTime]
  );

  const result: FlashcardSessionResult = {
    totalCards: cards.length,
    correctCount: attempts.filter((a) => a.correct).length,
    incorrectCount: attempts.filter((a) => !a.correct).length,
    attempts,
  };

  return {
    currentCard,
    currentIndex,
    totalCards: cards.length,
    isFlipped,
    isComplete,
    result,
    flip,
    swipe,
  };
}
