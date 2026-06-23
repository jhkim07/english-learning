"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitWriting } from "@/app/(app)/lesson/[lessonId]/writing/actions";
import type { WritingPrompt } from "@/lib/ai/generators/writing";
import type { WritingEvaluation } from "@/lib/ai/evaluation";
import { DAILY_VOLUME } from "@/lib/engines/constants";

type WritingStage = "draft" | "feedback" | "revision" | "complete";

interface Props {
  lessonId: string;
  prompt: WritingPrompt;
}

export function WritingRoomClient({ lessonId, prompt }: Props) {
  const [stage, setStage] = useState<WritingStage>("draft");
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingEvaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(true);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isInRange = wordCount >= DAILY_VOLUME.WRITING_MIN_WORDS && wordCount <= DAILY_VOLUME.WRITING_MAX_WORDS;

  async function handleSubmit() {
    if (!isInRange || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitWriting({
        lessonId,
        submission: text,
        prompt: prompt.prompt,
        targetGrammar: prompt.targetGrammar,
        minimumWords: prompt.minimumWords,
        maximumWords: prompt.maximumWords,
      });
      setFeedback(result);
      setStage("feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRevise() {
    setText("");
    setStage("revision");
  }

  async function handleRevisionSubmit() {
    if (!isInRange || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitWriting({
        lessonId,
        submission: text,
        prompt: prompt.prompt,
        targetGrammar: prompt.targetGrammar,
        minimumWords: prompt.minimumWords,
        maximumWords: prompt.maximumWords,
        isRevision: true,
      });
      setStage("complete");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "complete") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4 pt-12">
        <h2 className="text-2xl font-bold">Writing Complete!</h2>
        <p className="text-muted-foreground">Great work on your revision.</p>
        <Button asChild className="w-full">
          <a href={`/lesson/${lessonId}`}>Back to Lesson</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Collapsible Prompt */}
      <div className="border rounded-lg">
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setPromptExpanded((prev) => !prev)}
        >
          <span className="font-medium text-sm">Writing Prompt</span>
          <span className="text-muted-foreground text-xs">{promptExpanded ? "▲ collapse" : "▼ expand"}</span>
        </button>
        {promptExpanded && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-sm">{prompt.prompt}</p>
            {prompt.context && (
              <p className="text-xs text-muted-foreground">{prompt.context}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {prompt.targetGrammar.map((g) => (
                <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {prompt.minimumWords}–{prompt.maximumWords} words
            </p>
          </div>
        )}
      </div>

      {/* Stage header */}
      {stage === "revision" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="font-medium">Revision Draft</p>
          <p className="text-xs mt-1">Apply the feedback and write your revised version.</p>
        </div>
      )}

      {/* Textarea */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={stage === "revision" ? "Write your revised version here…" : "Start writing here…"}
        className="min-h-[300px] text-sm"
        disabled={stage === "feedback"}
      />

      {/* Word count + submit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isInRange ? "text-green-600" : wordCount > DAILY_VOLUME.WRITING_MAX_WORDS ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {wordCount} words
          </span>
          <span className="text-xs text-muted-foreground">
            ({DAILY_VOLUME.WRITING_MIN_WORDS}–{DAILY_VOLUME.WRITING_MAX_WORDS} required)
          </span>
        </div>

        {stage === "draft" && (
          <Button onClick={handleSubmit} disabled={!isInRange || isSubmitting}>
            {isSubmitting ? "Evaluating…" : "Submit"}
          </Button>
        )}
        {stage === "revision" && (
          <Button onClick={handleRevisionSubmit} disabled={!isInRange || isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Revision"}
          </Button>
        )}
      </div>

      {/* Feedback panel (shown after first submission) */}
      {stage === "feedback" && feedback && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{feedback.overallScore}</p>
              <p className="text-xs text-muted-foreground">/ 10</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-medium">{feedback.grammarScore}</p>
                <p className="text-muted-foreground">Grammar</p>
              </div>
              <div>
                <p className="font-medium">{feedback.naturalnessScore}</p>
                <p className="text-muted-foreground">Naturalness</p>
              </div>
              <div>
                <p className="font-medium">{feedback.logicScore}</p>
                <p className="text-muted-foreground">Logic</p>
              </div>
            </div>
          </div>

          {feedback.strengthPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {feedback.strengthPoints.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </div>
          )}

          {feedback.improvementPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">Improvements</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {feedback.improvementPoints.map((p, i) => <li key={i}>• {p}</li>)}
              </ul>
            </div>
          )}

          <Button className="w-full" onClick={handleRevise}>
            Revise My Writing
          </Button>
        </div>
      )}
    </div>
  );
}
