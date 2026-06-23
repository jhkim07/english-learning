import Anthropic from "@anthropic-ai/sdk";
import { PromptLoader } from "./prompt-loader";
import { isMockMode } from "./mock-registry";

export interface ValidationResult {
  approved: boolean;
  score: number; // 0.0–1.0
  issues: string[];
  validatedAt: Date;
  promptVersion: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatableContent = any;

export class ValidationAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async validate(
    contentType: string,
    content: ValidatableContent,
    userLevel: number
  ): Promise<ValidationResult> {
    const template = PromptLoader.load("validation", "validate");

    if (isMockMode()) {
      // Mock validation always approves in dev
      return {
        approved: true,
        score: 0.95,
        issues: [],
        validatedAt: new Date(),
        promptVersion: template.version,
      };
    }

    const userPrompt = PromptLoader.interpolate(template.userPromptTemplate, {
      contentType,
      content: JSON.stringify(content, null, 2),
      userLevel: String(userLevel),
    });

    const message = await this.client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: template.systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        approved: false,
        score: 0,
        issues: ["Validation response malformed"],
        validatedAt: new Date(),
        promptVersion: template.version,
      };
    }

    const result = JSON.parse(match[0]) as {
      approved: boolean;
      score: number;
      issues: string[];
    };
    return {
      approved: result.approved ?? false,
      score: result.score ?? 0,
      issues: result.issues ?? [],
      validatedAt: new Date(),
      promptVersion: template.version,
    };
  }
}
