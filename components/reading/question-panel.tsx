"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionWithState } from "./types";

interface Props {
  questionState: QuestionWithState;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (index: number) => void;
}

export function QuestionPanel({ questionState, questionNumber, totalQuestions, onAnswer }: Props) {
  const { question, answered, selectedIndex, isCorrect, adaptiveLoading } = questionState;

  if (adaptiveLoading) {
    return (
      <div className="w-80 p-6 flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Generating follow-up question…</p>
      </div>
    );
  }

  return (
    <div className="w-80 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Q{questionNumber} / {totalQuestions}
        </span>
        {questionState.isAdaptive && (
          <Badge variant="secondary" className="text-xs">Adaptive</Badge>
        )}
      </div>

      <p className="text-sm font-medium leading-relaxed">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((option, idx) => {
          let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
          if (answered) {
            if (idx === question.correctIndex) variant = "default";
            else if (idx === selectedIndex && !isCorrect) variant = "destructive";
          }

          return (
            <Button
              key={idx}
              variant={variant}
              className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
              onClick={() => !answered && onAnswer(idx)}
              disabled={answered}
            >
              <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
              {option}
            </Button>
          );
        })}
      </div>

      {answered && (
        <div className={`p-3 rounded-lg text-xs ${isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          <p className="font-medium">{isCorrect ? "✓ Correct" : "✗ Incorrect"}</p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
