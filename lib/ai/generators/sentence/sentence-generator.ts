import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { PromptTemplate } from "@/lib/ai/types";
import type { SentenceCard, SentenceGenerationInput } from "./types";

export class SentenceCardGenerator extends BaseGenerator<
  SentenceGenerationInput,
  SentenceCard[]
> {
  constructor() {
    super("sentence");
  }

  buildUserPrompt(input: SentenceGenerationInput, template: PromptTemplate): string {
    return PromptLoader.interpolate(template.userPromptTemplate, {
      count: String(input.count),
      userLevel: String(input.userLevel),
      studyGoal: input.studyGoal,
      relatedWords: input.relatedWords?.join(", ") ?? "none",
    });
  }

  parseLLMResponse(raw: string): SentenceCard[] {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("SentenceCardGenerator: no JSON array found");
    const cards = JSON.parse(match[0]) as SentenceCard[];
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("SentenceCardGenerator: empty or invalid card array");
    }
    return cards;
  }

  getMockFixtureKey(input: SentenceGenerationInput): string {
    return `sentence:${input.count}:${input.userLevel}`;
  }
}
