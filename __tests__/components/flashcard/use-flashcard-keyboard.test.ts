/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useFlashcardKeyboard } from "@/components/flashcard/use-flashcard-keyboard";

describe("useFlashcardKeyboard", () => {
  let onFlip: jest.Mock;
  let onSwipeRight: jest.Mock;
  let onSwipeLeft: jest.Mock;

  beforeEach(() => {
    onFlip = jest.fn();
    onSwipeRight = jest.fn();
    onSwipeLeft = jest.fn();
  });

  it("Space key triggers onFlip", () => {
    renderHook(() =>
      useFlashcardKeyboard({ onFlip, onSwipeRight, onSwipeLeft, isFlipped: false })
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight triggers onSwipeRight when flipped", () => {
    renderHook(() =>
      useFlashcardKeyboard({ onFlip, onSwipeRight, onSwipeLeft, isFlipped: true })
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight does NOT trigger when not flipped", () => {
    renderHook(() =>
      useFlashcardKeyboard({ onFlip, onSwipeRight, onSwipeLeft, isFlipped: false })
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
