"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DAILY_VOLUME } from "@/lib/engines/constants";
import type { ReviewItem } from "@/lib/engines";

interface Props {
  lessonId: string;
  reviewItems: ReviewItem[];
}

export function ErrorReviewClient({ lessonId, reviewItems }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  if (reviewItems.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-12">
        <h2 className="text-2xl font-bold">No errors to review!</h2>
        <p className="text-muted-foreground">Keep up the great work.</p>
        <Button asChild>
          <a href={`/lesson/${lessonId}`}>Back to Lesson</a>
        </Button>
      </div>
    );
  }

  const isComplete = currentIndex >= reviewItems.length;

  if (isComplete) {
    const correctCount = results.filter(Boolean).length;
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-12">
        <h2 className="text-2xl font-bold">Error Review Complete!</h2>
        <p className="text-4xl font-bold text-primary">
          {correctCount}/{results.length}
        </p>
        <p className="text-muted-foreground">errors reviewed</p>
        <Button asChild className="w-full">
          <a href={`/lesson/${lessonId}`}>Back to Lesson</a>
        </Button>
      </div>
    );
  }

  const item = reviewItems[currentIndex];
  const content = item.content as Record<string, unknown>;

  function handleReveal() {
    setRevealed(true);
  }

  function handleResult(correct: boolean) {
    setResults((prev) => [...prev, correct]);
    setCurrentIndex((prev) => prev + 1);
    setRevealed(false);
  }

  const domainColor: Record<string, string> = {
    conversation: "bg-blue-100 text-blue-700",
    reading: "bg-green-100 text-green-700",
    writing: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Error Review</h2>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {reviewItems.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentIndex / reviewItems.length) * 100}%` }}
        />
      </div>

      {/* Error card */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex gap-2">
          <Badge
            className={`text-xs ${domainColor[item.domain] ?? "bg-gray-100 text-gray-700"}`}
          >
            {item.domain}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {item.errorType}
          </Badge>
        </div>

        {/* Show what was wrong */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Your original response:</p>
          <p className="text-sm bg-muted/50 rounded p-2">
            {typeof content.original === "string"
              ? content.original
              : typeof content.word === "string"
              ? content.word
              : JSON.stringify(content).slice(0, 100)}
          </p>
        </div>

        {/* Reveal button or correction */}
        {!revealed ? (
          <Button variant="outline" className="w-full" onClick={handleReveal}>
            Show Correction
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Correction:</p>
              <p className="text-sm text-green-700 bg-green-50 rounded p-2">
                {item.feedback}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleResult(false)}
              >
                ✗ Still confused
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={() => handleResult(true)}
              >
                ✓ Got it!
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

