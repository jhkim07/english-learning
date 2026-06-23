"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveWeeklyScore } from "@/app/(app)/lesson/[lessonId]/weekly-assessment/actions";

interface Props {
  lessonId: string;
  weekNumber: number;
  studyDay: number;
  totalErrors: number;
}

export function WeeklyAssessmentClient({
  lessonId,
  weekNumber,
  studyDay,
  totalErrors,
}: Props) {
  const [submitted, setSubmitted] = useState(false);

  async function handleComplete() {
    // In MVP, weekly assessment uses error count as a proxy score
    // Real quiz generation is a V2 feature
    const mockCorrect = Math.max(0, 20 - totalErrors);
    const mockTotal = 20;
    await saveWeeklyScore({
      lessonId,
      weekNumber,
      correctItems: mockCorrect,
      totalItems: mockTotal,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 pt-12">
        <div className="text-5xl">📊</div>
        <h2 className="text-2xl font-bold">Week {weekNumber} Complete!</h2>
        <p className="text-muted-foreground">Keep up the great work. See you tomorrow!</p>
        <Button asChild className="w-full">
          <a href="/calendar">Back to Calendar</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-8">
      <div className="text-center space-y-2">
        <Badge variant="secondary">Week {weekNumber} of 4</Badge>
        <h2 className="text-2xl font-bold">Weekly Check-In</h2>
        <p className="text-sm text-muted-foreground">Day {studyDay} complete</p>
      </div>

      <div className="border rounded-lg p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Study days completed</span>
          <span className="font-medium">{studyDay}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Errors recorded</span>
          <span className="font-medium">{totalErrors}</span>
        </div>
      </div>

      <Button className="w-full" onClick={handleComplete}>
        Complete Week {weekNumber} Check-In
      </Button>
    </div>
  );
}
