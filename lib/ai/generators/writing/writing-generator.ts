import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { GenerationContext, PromptTemplate } from "@/lib/ai/types";
import type { WritingPrompt, WritingGenerationInput } from "./types";

export class WritingGenerator extends BaseGenerator<
  WritingGenerationInput,
  WritingPrompt
> {
  constructor() {
    super("writing");
  }

  buildUserPrompt(input: WritingGenerationInput, template: PromptTemplate): string {
    return PromptLoader.interpolate(template.userPromptTemplate, {
      userLevel: String(input.userLevel),
      studyGoal: input.studyGoal,
    });
  }

  parseLLMResponse(raw: string): WritingPrompt {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("WritingGenerator: no JSON found");
    const prompt = JSON.parse(match[0]) as WritingPrompt;
    if (!prompt.prompt) throw new Error("WritingGenerator: missing prompt");
    return prompt;
  }

  getMockFixtureKey(input: WritingGenerationInput): string {
    return `writing:${input.userLevel}`;
  }
}
