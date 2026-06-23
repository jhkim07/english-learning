import { useEffect } from "react";

interface FlashcardKeyboardOptions {
  onFlip: () => void;
  onSwipeRight: () => void;  // correct
  onSwipeLeft: () => void;   // incorrect
  isFlipped: boolean;
}

export function useFlashcardKeyboard({
  onFlip,
  onSwipeRight,
  onSwipeLeft,
  isFlipped,
}: FlashcardKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          onFlip();
          break;
        case "ArrowRight":
          if (isFlipped) { e.preventDefault(); onSwipeRight(); }
          break;
        case "ArrowLeft":
          if (isFlipped) { e.preventDefault(); onSwipeLeft(); }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFlip, onSwipeRight, onSwipeLeft, isFlipped]);
}
