import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { PromptTemplate } from "@/lib/ai/types";
import type { ReadingPassage, ReadingGenerationInput } from "./types";

const DEFAULT_TOPICS = [
  "workplace communication",
  "technology and society",
  "environmental challenges",
  "global business trends",
  "health and wellness",
];

export class ReadingGenerator extends BaseGenerator<
  ReadingGenerationInput,
  ReadingPassage
> {
  constructor() {
    super("reading");
  }

  buildUserPrompt(input: ReadingGenerationInput, template: PromptTemplate): string {
    const topic = input.topic ?? DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
    return PromptLoader.interpolate(template.userPromptTemplate, {
      userLevel: String(input.userLevel),
      studyGoal: input.studyGoal,
      topic,
    });
  }

  parseLLMResponse(raw: string): ReadingPassage {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("ReadingGenerator: no JSON object found");
    const passage = JSON.parse(match[0]) as ReadingPassage;
    if (!passage.passage || !passage.questions) {
      throw new Error("ReadingGenerator: missing passage or questions");
    }
    return passage;
  }

  getMockFixtureKey(input: ReadingGenerationInput): string {
    return `reading:${input.userLevel}`;
  }
}
