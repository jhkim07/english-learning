"use server";

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";
import { EvaluationAgent } from "@/lib/ai/evaluation";
import { isMockMode } from "@/lib/ai/mock-registry";
import { recordError } from "@/lib/errors/record-error";

interface SendTurnInput {
  lessonId: string;
  userMessage: string;
  scenarioContext: string;
  turnHistory: { role: "user" | "assistant"; content: string }[];
  turnNumber: number;
}

interface SendTurnResult {
  aiReply: string;
  evaluationScore: number;
}

export interface RoleplayLineEvaluation {
  meaningScore: number;
  feedback: string;
  mustFix: string[];
}

interface EvaluateRoleplayLineInput {
  koreanPrompt: string;
  learnerAnswer: string;
  suggestedExpression: string;
  scenarioTitle: string;
}

function clampScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function fallbackEvaluateMeaning(
  input: EvaluateRoleplayLineInput
): RoleplayLineEvaluation {
  const answer = input.learnerAnswer.trim();
  if (!answer) {
    return {
      meaningScore: 0,
      feedback: "문장의 의미를 전달할 영어 답변을 입력하세요.",
      mustFix: ["complete sentence"],
    };
  }

  const answerWords = answer.toLowerCase().split(/\s+/).filter(Boolean);
  const suggestedWords = input.suggestedExpression.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = suggestedWords.filter((word) =>
    answerWords.some((answerWord) => answerWord.replace(/[^a-z]/g, "") === word.replace(/[^a-z]/g, ""))
  ).length;
  const meaningScore = suggestedWords.length
    ? Math.max(35, Math.round((matched / suggestedWords.length) * 100))
    : 60;

  return {
    meaningScore,
    feedback:
      meaningScore >= 75
        ? "의미는 대체로 전달되었습니다. 더 자연스러운 표현은 복습에서 확인하세요."
        : "핵심 의미가 일부 부족합니다. 한국어 prompt의 주요 내용을 더 분명히 말해보세요.",
    mustFix: meaningScore >= 75 ? [] : ["missing key meaning"],
  };
}

export async function evaluateRoleplayLine(
  input: EvaluateRoleplayLineInput
): Promise<RoleplayLineEvaluation> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  if (isMockMode() || !process.env.ANTHROPIC_API_KEY) {
    return fallbackEvaluateMeaning(input);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system:
      "You evaluate English role-play answers by intended meaning, not by exact wording. Return only valid JSON.",
    messages: [
      {
        role: "user",
        content: `Evaluate whether the learner's English answer conveys the Korean prompt's intended meaning in this scenario.

Scenario: ${input.scenarioTitle}
Korean prompt: ${input.koreanPrompt}
Learner answer: ${input.learnerAnswer}
Reference expression for review only: ${input.suggestedExpression}

Do not require the reference wording. Score meaning delivery from 0 to 100.
Return JSON with this shape:
{
  "meaningScore": number,
  "feedback": "one short Korean sentence",
  "mustFix": ["short Korean or English phrase", "..."]
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonText);
    return {
      meaningScore: clampScore(parsed.meaningScore),
      feedback:
        typeof parsed.feedback === "string"
          ? parsed.feedback
          : "의미 전달 기준으로 평가했습니다.",
      mustFix: Array.isArray(parsed.mustFix)
        ? parsed.mustFix.filter((item: unknown) => typeof item === "string").slice(0, 5)
        : [],
    };
  } catch {
    return fallbackEvaluateMeaning(input);
  }
}

export async function sendConversationTurn(
  input: SendTurnInput
): Promise<SendTurnResult> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const evaluator = new EvaluationAgent();

  if (isMockMode()) {
    return {
      aiReply: "That's a great point! Could you tell me more about your experience with that?",
      evaluationScore: 8,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Generate AI reply
  const messages = input.turnHistory.map((t) => ({
    role: t.role as "user" | "assistant",
    content: t.content,
  }));
  messages.push({ role: "user", content: input.userMessage });

  const aiResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: `You are ${input.scenarioContext}. Keep responses concise (2-4 sentences). Stay in character. Do NOT break character or give meta-instructions.`,
    messages,
  });

  const aiReply =
    aiResponse.content[0].type === "text"
      ? aiResponse.content[0].text
      : "I see, please continue.";

  // Evaluate learner's message
  const evaluation = await evaluator.evaluateConversationTurn({
    learnerMessage: input.userMessage,
    scenarioContext: input.scenarioContext,
    turnNumber: input.turnNumber,
  });

  // Fire-and-forget: track speaking evaluation score for adaptive level adjustment
  prisma.speakingEvaluation.upsert({
    where: {
      userId_dailyLessonId: {
        userId,
        dailyLessonId: input.lessonId,
      },
    },
    update: {
      score: evaluation.overallScore / 100,
    },
    create: {
      userId,
      dailyLessonId: input.lessonId,
      score: evaluation.overallScore / 100,
    },
  }).catch(() => {});

  // Fire-and-forget: save grammar errors for spaced repetition
  for (const err of evaluation.grammarErrors ?? []) {
    recordError({
      userId,
      domain: "conversation",
      errorType: err.errorType ?? "grammar",
      content: {
        original: err.original,
        correction: err.correction,
        scenario: input.scenarioContext,
        turnNumber: input.turnNumber,
      },
      feedback: err.explanation ?? `Use "${err.correction}" instead of "${err.original}"`,
    }).catch(() => {});
  }

  return {
    aiReply,
    evaluationScore: evaluation.overallScore,
  };
}
