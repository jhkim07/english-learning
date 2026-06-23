import Anthropic from "@anthropic-ai/sdk";
import type { GenerationContext, GenerationResult, PromptTemplate } from "./types";
import { PromptLoader } from "./prompt-loader";
import { isMockMode, getMock } from "./mock-registry";

export abstract class BaseGenerator<TInput, TOutput> {
  protected client: Anthropic;
  protected promptDomain: string;

  constructor(promptDomain: string) {
    this.promptDomain = promptDomain;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  abstract buildUserPrompt(input: TInput, template: PromptTemplate): string;
  abstract parseLLMResponse(raw: string): TOutput;
  abstract getMockFixtureKey(input: TInput): string;

  async generate(
    input: TInput,
    context: GenerationContext
  ): Promise<GenerationResult<TOutput>> {
    const template = PromptLoader.load(this.promptDomain, "generate");
    const generationSeed = `${context.userId}-${context.studyDay}-${Date.now()}`;

    if (isMockMode()) {
      const key = this.getMockFixtureKey(input);
      const fixture = getMock(key);
      if (!fixture) {
        throw new Error(
          `AI_MOCK_MODE is on but no fixture registered for key: ${key}`
        );
      }
      return {
        data: fixture as TOutput,
        modelVersion: "mock-v1",
        promptVersion: template.version,
        generationSeed,
        generatedAt: new Date(),
        isMock: true,
      };
    }

    const userPrompt = this.buildUserPrompt(input, template);

    const message = await this.client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: template.systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";
    const data = this.parseLLMResponse(raw);

    return {
      data,
      modelVersion: "claude-opus-4-8",
      promptVersion: template.version,
      generationSeed,
      generatedAt: new Date(),
      isMock: false,
    };
  }
}
