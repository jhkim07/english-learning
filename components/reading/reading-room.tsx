"use client";

import { useState, useCallback } from "react";
import type { ReadingPassage } from "@/lib/ai/generators/reading";
import type { QuestionWithState, ReadingSessionState } from "./types";
import { PassagePanel } from "./passage-panel";
import { QuestionPanel } from "./question-panel";
import { generateAdaptiveQuestion } from "@/app/(app)/lesson/[lessonId]/reading/actions";
import { Button } from "@/components/ui/button";

interface Props {
  lessonId: string;
  passage: ReadingPassage;
}

export function ReadingRoom({ lessonId, passage }: Props) {
  const [session, setSession] = useState<ReadingSessionState>(() => ({
    currentQuestionIndex: 0,
    questions: passage.questions.map((q) => ({
      question: q,
      isAdaptive: false,
      answered: false,
      selectedIndex: null,
      isCorrect: null,
    })),
    isComplete: false,
    score: 0,
  }));

  const handleAnswer = useCallback(
    async (selectedIndex: number) => {
      const current = session.questions[session.currentQuestionIndex];
      if (current.answered) return;

      const isCorrect = selectedIndex === current.question.correctIndex;

      // Mark current question answered
      setSession((prev) => {
        const updated = [...prev.questions];
        updated[prev.currentQuestionIndex] = {
          ...current,
          answered: true,
          selectedIndex,
          isCorrect,
        };
        return { ...prev, questions: updated, score: prev.score + (isCorrect ? 1 : 0) };
      });

      // Generate adaptive follow-up (if no adaptive already attached to this core)
      const coreQuestion = current.question;
      const hasAdaptive = session.questions.some(
        (q) => q.isAdaptive && q.question.id.startsWith(coreQuestion.id)
      );

      if (!current.isAdaptive && !hasAdaptive) {
        // Insert placeholder
        setSession((prev) => {
          const updated = [...prev.questions];
          const insertIdx = prev.currentQuestionIndex + 1;
          updated.splice(insertIdx, 0, {
            question: { ...coreQuestion, id: `${coreQuestion.id}_adaptive` } as QuestionWithState["question"],
            isAdaptive: true,
            answered: false,
            selectedIndex: null,
            isCorrect: null,
            adaptiveLoading: true,
          });
          return { ...prev, questions: updated };
        });

        try {
          const adaptive = await generateAdaptiveQuestion({
            lessonId,
            coreQuestionId: coreQuestion.id,
            learnerAnswerIndex: selectedIndex,
            passage: passage.passage,
          });

          setSession((prev) => {
            const updated = [...prev.questions];
            const adaptiveIdx = updated.findIndex(
              (q) => q.isAdaptive && q.question.id === `${coreQuestion.id}_adaptive`
            );
            if (adaptiveIdx !== -1) {
              updated[adaptiveIdx] = {
                question: adaptive,
                isAdaptive: true,
                answered: false,
                selectedIndex: null,
                isCorrect: null,
                adaptiveLoading: false,
              };
            }
            return { ...prev, questions: updated };
          });
        } catch {
          // Remove placeholder if generation fails
          setSession((prev) => {
            const updated = prev.questions.filter(
              (q) => !(q.isAdaptive && q.question.id === `${coreQuestion.id}_adaptive`)
            );
            return { ...prev, questions: updated };
          });
        }
      }

      // Advance to next question
      setSession((prev) => {
        const nextIndex = prev.currentQuestionIndex + 1;
        const isComplete = nextIndex >= prev.questions.length;
        return { ...prev, currentQuestionIndex: nextIndex, isComplete };
      });
    },
    [session, lessonId, passage.passage]
  );

  if (session.isComplete) {
    const pct = Math.round((session.score / 12) * 100);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Reading Complete!</h2>
          <p className="text-4xl font-bold text-primary">{pct}%</p>
          <p className="text-muted-foreground">{session.score} / 12 correct</p>
          <Button asChild>
            <a href={`/lesson/${lessonId}`}>Back to Lesson</a>
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = session.questions[session.currentQuestionIndex];

  return (
    <div className="flex h-full gap-0">
      <PassagePanel passage={passage} />
      <QuestionPanel
        questionState={currentQ}
        questionNumber={session.currentQuestionIndex + 1}
        totalQuestions={session.questions.length}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
