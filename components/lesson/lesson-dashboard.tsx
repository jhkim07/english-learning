"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface LessonInfo {
  id: string;
  studyDay: number;
  generationStatus: string;
  vocabStatus: string;
  sentenceStatus: string;
  readingStatus: string;
  speakingStatus: string;
  writingStatus: string;
}

interface Activity {
  key: string;
  label: string;
  description: string;
  href: string;
  emoji: string;
}

const ACTIVITIES: Activity[] = [
  {
    key: "flashcards",
    label: "Flashcards",
    description: "24 cards: 12 vocab + 4 sentence + 8 review",
    href: "flashcards",
    emoji: "🃏",
  },
  {
    key: "conversation",
    label: "Conversation",
    description: "Role-play scenario (min. 8 turns)",
    href: "conversation",
    emoji: "💬",
  },
  {
    key: "reading",
    label: "Reading",
    description: "400–450 word passage + 12 questions",
    href: "reading",
    emoji: "📖",
  },
  {
    key: "writing",
    label: "Writing",
    description: "180–220 words + 1 revision",
    href: "writing",
    emoji: "✍️",
  },
  {
    key: "error-review",
    label: "Error Review",
    description: "5 targeted corrections from past errors",
    href: "error-review",
    emoji: "🔁",
  },
];

const STORAGE_KEY = (lessonId: string) => `lesson-progress-${lessonId}`;

interface Props {
  lesson: LessonInfo;
}

export function LessonDashboard({ lesson }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // Load completion state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY(lesson.id));
    if (stored) {
      try {
        setCompleted(new Set(JSON.parse(stored)));
      } catch {
        // ignore
      }
    }
  }, [lesson.id]);

  const allComplete = ACTIVITIES.every((a) => completed.has(a.key));

  if (allComplete) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold">Daily Session Complete!</h2>
        <p className="text-muted-foreground">
          You completed all 5 activities for Day {lesson.studyDay}.
        </p>
        <p className="text-sm text-muted-foreground">
          Come back tomorrow for Day {lesson.studyDay + 1}.
        </p>
        <Button asChild className="w-full">
          <a href="/calendar">View Calendar</a>
        </Button>
      </div>
    );
  }

  const completedCount = ACTIVITIES.filter((a) => completed.has(a.key)).length;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Day {lesson.studyDay}</h2>
          <Badge variant="outline">{completedCount}/5 done</Badge>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / ACTIVITIES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {ACTIVITIES.map((activity) => {
          const isDone = completed.has(activity.key);
          return (
            <a
              key={activity.key}
              href={`/lesson/${lesson.id}/${activity.href}`}
              className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                isDone
                  ? "bg-muted/50 border-muted"
                  : "hover:bg-accent hover:border-accent-foreground/20"
              }`}
            >
              <span className="text-2xl">{activity.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? "text-muted-foreground" : ""}`}>
                  {activity.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
