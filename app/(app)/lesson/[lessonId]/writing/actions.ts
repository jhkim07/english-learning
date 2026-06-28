"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";
import { EvaluationAgent } from "@/lib/ai/evaluation";
import type { WritingEvaluation } from "@/lib/ai/evaluation";
import { recordError } from "@/lib/errors/record-error";

interface SubmitWritingInput {
  lessonId: string;
  submission: string;
  prompt: string;
  targetGrammar: string[];
  minimumWords: number;
  maximumWords: number;
  isRevision?: boolean;
}

export async function submitWriting(
  input: SubmitWritingInput
): Promise<WritingEvaluation> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const agent = new EvaluationAgent();

  const result = await agent.evaluateWriting({
    submission: input.submission,
    prompt: input.prompt,
    targetGrammar: input.targetGrammar,
    minimumWords: input.minimumWords,
    maximumWords: input.maximumWords,
  });

  // Fire-and-forget: track writing submission score for adaptive level adjustment
  prisma.writingSubmission.create({
    data: {
      userId,
      dailyLessonId: input.lessonId,
      evaluationScore: result.grammarScore / 100,
    },
  }).catch(() => {});

  // Save grammar errors and improvement points to error queue for spaced repetition
  const errors = [
    ...result.improvementPoints.map((point) => ({
      errorType: "grammar_improvement",
      feedback: point,
    })),
    ...(result.usedTargetGrammar === false
      ? [{ errorType: "missed_target_grammar", feedback: `Did not use required structures: ${input.targetGrammar.join(", ")}` }]
      : []),
  ];

  for (const err of errors) {
    recordError({
      userId,
      domain: "writing",
      errorType: err.errorType,
      content: { prompt: input.prompt, submission: input.submission, grammarScore: result.grammarScore },
      feedback: err.feedback,
    }).catch(() => {});
  }

  return result;
}
