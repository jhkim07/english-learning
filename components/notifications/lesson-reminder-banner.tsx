"use client";

import { Button } from "@/components/ui/button";

interface Props {
  lessonId: string;
  completedCount: number;
}

export function LessonReminderBanner({ lessonId, completedCount }: Props) {
  if (completedCount >= 5) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-amber-800">
        Today's lesson: {completedCount}/5 activities done
      </span>
      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
        <a href={`/lesson/${lessonId}`}>Continue</a>
      </Button>
    </div>
  );
}
