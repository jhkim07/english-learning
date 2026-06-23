"use client";

import type { ReadingPassage } from "@/lib/ai/generators/reading";
import { Badge } from "@/components/ui/badge";

interface Props {
  passage: ReadingPassage;
}

export function PassagePanel({ passage }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-6 border-r">
      <div className="max-w-prose">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold">{passage.title}</h2>
          <Badge variant="outline">{passage.wordCount} words</Badge>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{passage.passage}</p>
      </div>
    </div>
  );
}
