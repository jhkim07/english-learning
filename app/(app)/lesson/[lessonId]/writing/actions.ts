"use server";

import { EvaluationAgent } from "@/lib/ai/evaluation";
import type { WritingEvaluation } from "@/lib/ai/evaluation";

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
  const agent = new EvaluationAgent();

  const result = await agent.evaluateWriting({
    submission: input.submission,
    prompt: input.prompt,
    targetGrammar: input.targetGrammar,
    minimumWords: input.minimumWords,
    maximumWords: input.maximumWords,
  });

  return result;
}
