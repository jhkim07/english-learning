"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";
import { AdaptiveQuestionGenerator } from "@/lib/ai/generators/adaptive";
import { ValidationAgent } from "@/lib/ai/validation-agent";
import { isMockMode } from "@/lib/ai/mock-registry";
import { registerAdaptiveMocks } from "@/lib/ai/generators/adaptive/mocks";
import type { AdaptiveQuestion } from "@/lib/ai/generators/adaptive";
import type { UnknownWord } from "@/components/reading/types";
import { recordError } from "@/lib/errors/record-error";
import Anthropic from "@anthropic-ai/sdk";

// Register mocks at module level for mock mode
if (isMockMode()) {
  registerAdaptiveMocks();
}

interface GenerateAdaptiveInput {
  lessonId: string;
  coreQuestionId: string;
  coreQuestion?: string;
  coreCorrectIndex?: number;
  learnerAnswerIndex: number;
  passage: string;
}

export async function generateAdaptiveQuestion(
  input: GenerateAdaptiveInput
): Promise<AdaptiveQuestion> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { currentLevel: true, studyGoal: true },
  });

  const userLevel = profile?.currentLevel ?? 3;
  const studyGoal = profile?.studyGoal ?? "general";

  const generator = new AdaptiveQuestionGenerator();

  const result = await generator.generate(
    {
      adaptiveInput: {
        coreQuestion: {
          id: input.coreQuestionId,
          question: "Core question",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          questionType: "detail",
        },
        learnerAnswerIndex: input.learnerAnswerIndex as 0 | 1 | 2 | 3,
        passage: input.passage,
        userLevel,
      },
      studyGoal,
    },
    {
      userId,
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: userLevel,
      userLevel,
      studyGoal,
    }
  );

  // Run through ValidationAgent — log failures but don't block learner (MVP rule)
  try {
    const validator = new ValidationAgent();
    const validationResult = await validator.validate("reading", result.data, userLevel);
    if (!validationResult.approved) {
      console.warn("[adaptive] ValidationAgent did not approve question:", validationResult);
    }
  } catch (err) {
    console.error("[adaptive] ValidationAgent error (non-blocking):", err);
  }

  // Fire-and-forget: track reading attempt for adaptive level adjustment
  prisma.readingAttempt.create({
    data: {
      userId,
      dailyLessonId: input.lessonId,
      questionId: input.coreQuestionId,
      isCorrect: result.data.answerOutcome === "correct",
    },
  }).catch(() => {});

  // Record wrong answers for spaced repetition
  if (result.data.answerOutcome !== "correct" && result.data.errorType !== "none") {
    recordError({
      userId,
      domain: "reading",
      errorType: result.data.errorType,
      content: {
        questionId: input.coreQuestionId,
        coreQuestion: input.coreQuestion,
        learnerAnswerIndex: input.learnerAnswerIndex,
        coreCorrectIndex: input.coreCorrectIndex,
      },
      feedback: result.data.explanation ?? `Error type: ${result.data.errorType}`,
    }).catch(() => {});
  }

  return result.data;
}

// Small mock table for words that commonly appear in business reading passages
const MOCK_WORD_DEFS: Record<string, { definition: string; koreanMeaning: string }> = {
  remote: { definition: "Done or located away from the main workplace.", koreanMeaning: "원격의, 재택의" },
  hybrid: { definition: "Combining two different modes or systems.", koreanMeaning: "혼합형, 하이브리드" },
  productivity: { definition: "The effectiveness of effort; output per unit of input.", koreanMeaning: "생산성" },
  cohesion: { definition: "The quality of forming a united, consistent whole.", koreanMeaning: "결속력, 단결" },
  mentorship: { definition: "Guidance given by an experienced person to a less experienced one.", koreanMeaning: "멘토링" },
  friction: { definition: "Conflict or resistance arising from incompatible views.", koreanMeaning: "마찰, 갈등" },
  paradoxically: { definition: "In a way that seems contradictory but may nonetheless be true.", koreanMeaning: "역설적으로" },
  flexibility: { definition: "Willingness or ability to adapt to new conditions.", koreanMeaning: "유연성" },
  collaboration: { definition: "The act of working jointly with others toward a shared goal.", koreanMeaning: "협업" },
  commute: { definition: "To travel regularly between home and workplace.", koreanMeaning: "통근하다" },
  workforce: { definition: "The people engaged in or available for work in a company or area.", koreanMeaning: "노동력, 인력" },
  accelerated: { definition: "Increased in speed or rate of development.", koreanMeaning: "가속화된" },
  arrangements: { definition: "Plans or preparations made in advance for a purpose.", koreanMeaning: "방식, 약정" },
  fundamentally: { definition: "In a way that is central or primary; at the most basic level.", koreanMeaning: "근본적으로" },
  permeate: { definition: "To spread throughout and be present in every part.", koreanMeaning: "스며들다" },
  evolving: { definition: "Gradually developing or changing over time.", koreanMeaning: "진화하는, 변화하는" },
  retain: { definition: "To continue to have or keep something.", koreanMeaning: "유지하다, 보유하다" },
  amortize: { definition: "To gradually reduce a debt or cost over a period.", koreanMeaning: "상각하다" },
};

export async function lookupWord(input: {
  word: string;
  passage: string;
}): Promise<UnknownWord> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const normalized = input.word.toLowerCase().replace(/[^a-z']/g, "");

  if (isMockMode()) {
    const mock = MOCK_WORD_DEFS[normalized];
    return {
      word: normalized,
      definition: mock?.definition ?? `A word used in this passage.`,
      koreanMeaning: mock?.koreanMeaning ?? `(AI 연결 시 한국어 뜻 표시)`,
      phonetic: "/ˈmɒk/",
      audioUrl: undefined,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Run Claude (Korean meaning) and Free Dictionary API (IPA + audio) in parallel
  const [claudeRes, dictRes] = await Promise.allSettled([
    client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `You are a dictionary for English learners. Respond ONLY with valid JSON: {"definition":"...","koreanMeaning":"..."}
- definition: one clear sentence under 20 words
- koreanMeaning: 1–4 Korean words, no explanation`,
      messages: [{ role: "user", content: `Word: "${normalized}"\nContext: "${input.passage.slice(0, 300)}"` }],
    }),
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`),
  ]);

  // Extract definition + Korean meaning from Claude
  let definition = "Definition not available.";
  let koreanMeaning = normalized;
  if (claudeRes.status === "fulfilled") {
    const raw = claudeRes.value.content[0].type === "text" ? claudeRes.value.content[0].text : "{}";
    try {
      const parsed = JSON.parse(raw.match(/\{[\s\S]*?\}/)?.[0] ?? "{}");
      definition = parsed.definition ?? definition;
      koreanMeaning = parsed.koreanMeaning ?? koreanMeaning;
    } catch { /* use defaults */ }
  }

  // Extract IPA phonetic + audio URL from Free Dictionary API
  let phonetic: string | undefined;
  let audioUrl: string | undefined;
  if (dictRes.status === "fulfilled" && dictRes.value.ok) {
    try {
      const data = await dictRes.value.json() as Array<{
        phonetic?: string;
        phonetics?: Array<{ text?: string; audio?: string }>;
      }>;
      const entry = data[0];
      // Prefer phonetic with a non-empty audio URL
      const withAudio = entry?.phonetics?.find((p) => p.audio && p.audio.length > 0);
      const withText = entry?.phonetics?.find((p) => p.text && p.text.length > 0);
      phonetic = withAudio?.text ?? withText?.text ?? entry?.phonetic;
      audioUrl = withAudio?.audio;
    } catch { /* no phonetics */ }
  }

  return { word: normalized, definition, koreanMeaning, phonetic, audioUrl };
}

export async function translatePassage(passage: string): Promise<string> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  if (isMockMode()) {
    return "이것은 목업 한국어 번역입니다. AI 연결 시 실제 번역이 표시됩니다.";
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: "You are a professional Korean translator. Translate the given English passage into natural, fluent Korean. Preserve paragraph breaks with \\n\\n. Output ONLY the Korean translation — no introduction, no explanation.",
    messages: [{ role: "user", content: passage }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "번역을 불러올 수 없습니다.";
}
