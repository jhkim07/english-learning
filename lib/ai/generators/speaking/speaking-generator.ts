import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { GenerationContext, PromptTemplate } from "@/lib/ai/types";
import type { SpeakingScenario, SpeakingGenerationInput } from "./types";

export class SpeakingScenarioGenerator extends BaseGenerator<
  SpeakingGenerationInput,
  SpeakingScenario
> {
  constructor() {
    super("speaking");
  }

  buildUserPrompt(input: SpeakingGenerationInput, template: PromptTemplate): string {
    return PromptLoader.interpolate(template.userPromptTemplate, {
      userLevel: String(input.userLevel),
      studyGoal: input.studyGoal,
      previousCategories: input.previousCategories?.join(", ") ?? "none",
    });
  }

  parseLLMResponse(raw: string): SpeakingScenario {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("SpeakingScenarioGenerator: no JSON found");
    const scenario = JSON.parse(match[0]) as SpeakingScenario;
    if (!scenario.openingMessage) throw new Error("SpeakingScenarioGenerator: missing openingMessage");
    return scenario;
  }

  getMockFixtureKey(input: SpeakingGenerationInput): string {
    return `speaking:${input.userLevel}`;
  }
}
