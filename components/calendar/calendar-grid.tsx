"use client";

import { useRouter } from "next/navigation";
import type { CalendarSlot } from "@/lib/calendar";

interface CalendarGridProps {
  slots: CalendarSlot[];
  todayStudyDay: number | null;
}

export function CalendarGrid({ slots, todayStudyDay }: CalendarGridProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Today's action button */}
      {todayStudyDay && (
        <button
          onClick={() => router.push("/today")}
          className="w-full py-4 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg transition-opacity hover:opacity-90"
        >
          오늘 학습 시작 →
        </button>
      )}

      {/* 20-day grid — 4 columns, 5 rows */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {slots.map((slot) => (
          <CalendarCell key={slot.studyDay} slot={slot} />
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ slot }: { slot: CalendarSlot }) {
  const { state, studyDay } = slot;

  const baseClass =
    "aspect-square flex flex-col items-center justify-center rounded-xl relative overflow-hidden";

  const stateClass = {
    completed: "bg-green-50 border-2 border-green-500",
    in_progress: "bg-primary/10 border-2 border-primary/50",
    today: "bg-primary border-2 border-primary",
    locked: "bg-muted/50 border border-border opacity-60",
    future: "bg-muted/20 border border-dashed border-border",
  }[state];

  const numberClass = {
    completed: "text-green-700 font-semibold",
    in_progress: "text-primary font-semibold",
    today: "text-primary-foreground font-bold",
    locked: "text-muted-foreground",
    future: "text-muted-foreground/60",
  }[state];

  return (
    <div className={`${baseClass} ${stateClass}`}>
      {state === "completed" && (
        // Filled green circle indicator
        <div className="absolute inset-2 rounded-full bg-green-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{studyDay}</span>
        </div>
      )}
      {state === "in_progress" && (
        // Animated partial stroke for in-progress
        <div className="absolute inset-2 rounded-full border-2 border-primary animate-pulse-ring flex items-center justify-center">
          <span className={`text-sm ${numberClass}`}>{studyDay}</span>
        </div>
      )}
      {state === "today" && (
        <span className={`text-base ${numberClass}`}>{studyDay}</span>
      )}
      {(state === "locked" || state === "future") && (
        <span className={`text-sm ${numberClass}`}>{studyDay}</span>
      )}
    </div>
  );
}
