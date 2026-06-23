"use server";

import Anthropic from "@anthropic-ai/sdk";
import { EvaluationAgent } from "@/lib/ai/evaluation";
import { isMockMode } from "@/lib/ai/mock-registry";

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

export async function sendConversationTurn(
  input: SendTurnInput
): Promise<SendTurnResult> {
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
    model: "claude-opus-4-8",
    max_tokens: 300,
    system: `You are ${input.scenarioContext}. Keep responses concise (2-4 sentences). Stay in character.`,
    messages,
  });

  const aiReply =
    aiResponse.content[0].type === "text"
      ? aiResponse.content[0].text
      : "I see, please continue.";

  // Evaluate learner's message in parallel (fire and don't wait to block UI)
  const evaluation = await evaluator.evaluateConversationTurn({
    learnerMessage: input.userMessage,
    scenarioContext: input.scenarioContext,
    turnNumber: input.turnNumber,
  });

  return {
    aiReply,
    evaluationScore: evaluation.overallScore,
  };
}
