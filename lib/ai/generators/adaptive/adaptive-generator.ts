import { BaseGenerator } from "@/lib/ai/base-generator";
import { PromptLoader } from "@/lib/ai/prompt-loader";
import type { GenerationContext, PromptTemplate } from "@/lib/ai/types";
import type { AdaptiveGenerationInput, AdaptiveQuestion, AnswerOutcome, ErrorType } from "./types";

export class AdaptiveQuestionGenerator extends BaseGenerator<
  AdaptiveGenerationInput,
  AdaptiveQuestion
> {
  // Store the last input ID so parseLLMResponse can use it
  private lastInputId = "q1";

  constructor() {
    super("adaptive");
  }

  buildUserPrompt(input: AdaptiveGenerationInput, template: PromptTemplate): string {
    const { adaptiveInput, studyGoal } = input;
    const { coreQuestion, passage, learnerAnswerIndex, userLevel } = adaptiveInput;

    return PromptLoader.interpolate(template.userPromptTemplate, {
      passage: passage.slice(0, 1500), // truncate long passages to save tokens
      questionId: coreQuestion.id,
      questionType: coreQuestion.questionType,
      question: coreQuestion.question,
      options: coreQuestion.options
        .map((opt, i) => `${i}: ${opt}`)
        .join(" | "),
      correctIndex: String(coreQuestion.correctIndex),
      learnerAnswerIndex: String(learnerAnswerIndex),
      userLevel: String(userLevel),
      studyGoal,
    });
  }

  parseLLMResponse(raw: string): AdaptiveQuestion {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AdaptiveQuestionGenerator: no JSON found");

    const parsed = JSON.parse(match[0]) as {
      answerOutcome: AnswerOutcome;
      errorType: ErrorType;
      followUpQuestion: {
        question: string;
        options: [string, string, string, string];
        correctIndex: 0 | 1 | 2 | 3;
        explanation: string;
        evidenceText?: string;
      };
    };

    return {
      id: `${this.lastInputId}_adaptive`,
      question: parsed.followUpQuestion.question,
      options: parsed.followUpQuestion.options,
      correctIndex: parsed.followUpQuestion.correctIndex,
      explanation: parsed.followUpQuestion.explanation,
      evidenceText: parsed.followUpQuestion.evidenceText,
      answerOutcome: parsed.answerOutcome,
      errorType: parsed.errorType,
      difficulty: parsed.answerOutcome === "correct" ? 4 : 2,
    };
  }

  getMockFixtureKey(input: AdaptiveGenerationInput): string {
    const outcome =
      input.adaptiveInput.learnerAnswerIndex === input.adaptiveInput.coreQuestion.correctIndex
        ? "correct"
        : "incorrect";
    return `adaptive:${outcome}`;
  }

  override async generate(
    input: AdaptiveGenerationInput,
    context: GenerationContext
  ) {
    this.lastInputId = input.adaptiveInput.coreQuestion.id;
    return super.generate(input, context);
  }
}
