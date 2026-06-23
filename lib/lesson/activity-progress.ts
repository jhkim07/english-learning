export const ACTIVITY_KEYS = [
  "flashcards",
  "conversation",
  "reading",
  "writing",
  "error-review",
] as const;

export type ActivityKey = typeof ACTIVITY_KEYS[number];

export function getLessonProgressKey(lessonId: string): string {
  return `lesson-progress-${lessonId}`;
}

export function markActivityComplete(lessonId: string, activity: ActivityKey): void {
  if (typeof window === "undefined") return;
  const key = getLessonProgressKey(lessonId);
  const stored = localStorage.getItem(key);
  const completed: string[] = stored ? JSON.parse(stored) : [];
  if (!completed.includes(activity)) {
    completed.push(activity);
    localStorage.setItem(key, JSON.stringify(completed));
  }
}

export function getCompletedActivities(lessonId: string): ActivityKey[] {
  if (typeof window === "undefined") return [];
  const key = getLessonProgressKey(lessonId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}
