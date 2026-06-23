"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitMonthlyExam } from "@/app/(app)/monthly-exam/actions";
import type { ProgressionResult } from "@/lib/progression/progression-engine";

interface Props {
  currentLevel: number;
}

const DECISION_MESSAGES: Record<
  string,
  { title: string; description: string; emoji: string }
> = {
  promote: {
    emoji: "🚀",
    title: "Level Up!",
    description: "Excellent work! You've been promoted to the next level.",
  },
  stay: {
    emoji: "💪",
    title: "Keep Going!",
    description: "Good effort! Continue at the current level to strengthen your skills.",
  },
  remediation: {
    emoji: "📚",
    title: "Let's Review",
    description: "Let's spend more time on the fundamentals before moving on.",
  },
};

export function MonthlyExamClient({ currentLevel }: Props) {
  const [result, setResult] = useState<ProgressionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      // MVP: simulate exam with a mock score derived from level
      const mockCorrect = 16; // 80% of 20
      const mockTotal = 20;
      const res = await submitMonthlyExam({
        correctItems: mockCorrect,
        totalItems: mockTotal,
        currentLevel,
      });
      setResult(res);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const msg = DECISION_MESSAGES[result.decision];
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-12">
        <div className="text-6xl">{msg.emoji}</div>
        <h2 className="text-2xl font-bold">{msg.title}</h2>
        <p className="text-muted-foreground">{msg.description}</p>
        <p className="text-sm text-muted-foreground">{result.reason}</p>
        <Button asChild className="w-full">
          <a href="/calendar">Start Next Month</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">🎓</div>
        <h2 className="text-2xl font-bold">Monthly Assessment</h2>
        <p className="text-sm text-muted-foreground">
          Current level: {currentLevel} | Complete to receive your progression decision
        </p>
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Evaluating…" : "Complete Monthly Assessment"}
      </Button>
    </div>
  );
}
