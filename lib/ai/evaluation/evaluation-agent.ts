import Anthropic from "@anthropic-ai/sdk";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import { isMockMode } from "@/lib/ai/mock-registry";
import type {
  ConversationTurnInput,
  ConversationEvaluation,
  WritingEvaluationInput,
  WritingEvaluation,
  ReadingEvaluationInput,
  ReadingEvaluation,
} from "./types";

export class EvaluationAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async evaluateConversationTurn(
    input: ConversationTurnInput
  ): Promise<ConversationEvaluation> {
    if (isMockMode()) {
      return {
        domain: "conversation",
        overallScore: 8,
        grammarErrors: [],
        vocabularyErrors: [],
        fluencyScore: 8,
        naturalness: 7,
        feedback: "Good response! Your sentence structure is clear and natural.",
      };
    }

    const template = PromptLoader.load("evaluation", "conversation");
    const userPrompt = PromptLoader.interpolate(template.userPromptTemplate, {
      scenarioContext: input.scenarioContext,
      turnNumber: String(input.turnNumber),
      learnerMessage: input.learnerMessage,
    });

    const raw = await this.callLLM(template.systemPrompt, userPrompt);
    const result = this.extractJson<ConversationEvaluation>(raw);
    return { ...result, domain: "conversation" };
  }

  async evaluateWriting(
    input: WritingEvaluationInput
  ): Promise<WritingEvaluation> {
    if (isMockMode()) {
      return {
        domain: "writing",
        overallScore: 7,
        grammarScore: 8,
        naturalnessScore: 7,
        logicScore: 7,
        wordCount: input.submission.split(/\s+/).length,
        meetsWordCount: true,
        usedTargetGrammar: true,
        strengthPoints: ["Clear topic sentences", "Good use of transitions"],
        improvementPoints: ["Vary sentence length", "Add specific examples"],
        revisedIntro: undefined,
      };
    }

    const template = PromptLoader.load("evaluation", "writing");
    const userPrompt = PromptLoader.interpolate(template.userPromptTemplate, {
      prompt: input.prompt,
      targetGrammar: input.targetGrammar.join(", "),
      minimumWords: String(input.minimumWords),
      maximumWords: String(input.maximumWords),
      submission: input.submission,
    });

    const raw = await this.callLLM(template.systemPrompt, userPrompt);
    const result = this.extractJson<WritingEvaluation>(raw);
    return { ...result, domain: "writing" };
  }

  async evaluateReadingAnswer(
    input: ReadingEvaluationInput
  ): Promise<ReadingEvaluation> {
    if (isMockMode()) {
      return {
        domain: "reading",
        correct: true,
        partialCredit: 1.0,
        errorType: "none",
        feedback:
          "Correct! You identified the key information from the passage.",
      };
    }

    const template = PromptLoader.load("evaluation", "reading");
    const userPrompt = PromptLoader.interpolate(template.userPromptTemplate, {
      question: input.question,
      correctAnswer: input.correctAnswer,
      evidenceText: input.evidenceText ?? "No specific evidence provided",
      learnerAnswer: input.learnerAnswer,
    });

    const raw = await this.callLLM(template.systemPrompt, userPrompt);
    const result = this.extractJson<ReadingEvaluation>(raw);
    return { ...result, domain: "reading" };
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return message.content[0].type === "text" ? message.content[0].text : "{}";
  }

  private extractJson<T>(raw: string): T {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("EvaluationAgent: no JSON found in response");
    return JSON.parse(match[0]) as T;
  }
}
