"use client";

import { useEffect, useState } from "react";
import { LessonReminderBanner } from "./lesson-reminder-banner";

interface Props {
  lessonId: string | null;
}

export function LessonStatusChecker({ lessonId }: Props) {
  const [completedCount, setCompletedCount] = useState(5); // default to "done" (hidden)

  useEffect(() => {
    if (!lessonId) return;
    const key = `lesson-progress-${lessonId}`;
    const stored = localStorage.getItem(key);
    const completed: string[] = stored ? JSON.parse(stored) : [];
    setCompletedCount(completed.length);
  }, [lessonId]);

  if (!lessonId) return null;
  return <LessonReminderBanner lessonId={lessonId} completedCount={completedCount} />;
}
