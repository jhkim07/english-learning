import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { PromptTemplate } from "@/lib/ai/types";
import type { VocabularyCard, VocabularyGenerationInput } from "./types";

export class VocabularyGenerator extends BaseGenerator<
  VocabularyGenerationInput,
  VocabularyCard[]
> {
  constructor() {
    super("vocabulary");
  }

  buildUserPrompt(
    input: VocabularyGenerationInput,
    template: PromptTemplate
  ): string {
    return PromptLoader.interpolate(template.userPromptTemplate, {
      count: String(input.count),
      userLevel: String(input.userLevel),
      studyGoal: input.studyGoal,
      previousWords: input.previousWords?.join(", ") ?? "none",
    });
  }

  parseLLMResponse(raw: string): VocabularyCard[] {
    // Extract JSON array from response (may have markdown code fences)
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error(
        "VocabularyGenerator: no JSON array found in LLM response"
      );
    }
    const cards = JSON.parse(match[0]) as VocabularyCard[];
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("VocabularyGenerator: empty or invalid card array");
    }
    return cards;
  }

  getMockFixtureKey(input: VocabularyGenerationInput): string {
    return `vocabulary:${input.count}:${input.userLevel}`;
  }
}
