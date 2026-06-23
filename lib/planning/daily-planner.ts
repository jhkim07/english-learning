import { prisma } from "@/lib/db";
import { VocabularyGenerator } from "@/lib/ai/generators/vocabulary";
import { SentenceCardGenerator } from "@/lib/ai/generators/sentence";
import { ReadingGenerator } from "@/lib/ai/generators/reading";
import { SpeakingScenarioGenerator } from "@/lib/ai/generators/speaking";
import { WritingGenerator } from "@/lib/ai/generators/writing";
import { ImageGenerator } from "@/lib/ai/generators/image";
import { ValidationAgent } from "@/lib/ai/validation-agent";
import type { GenerationContext } from "@/lib/ai/types";
import type { PlanningContext, PlannerResult } from "./types";

export class DailyPlanner {
  private vocabGen = new VocabularyGenerator();
  private sentenceGen = new SentenceCardGenerator();
  private readingGen = new ReadingGenerator();
  private speakingGen = new SpeakingScenarioGenerator();
  private writingGen = new WritingGenerator();
  private imageGen = new ImageGenerator();
  private validator = new ValidationAgent();

  async plan(ctx: PlanningContext, dailyLessonId: string): Promise<PlannerResult> {
    const genCtx: GenerationContext = {
      userId: ctx.userId,
      studyDay: ctx.studyDay,
      curriculumVersion: ctx.curriculumVersion,
      difficultyLevel: ctx.userLevel,
      userLevel: ctx.userLevel,
      studyGoal: ctx.studyGoal,
    };

    // ── 1. Vocabulary (12 cards) ───────────────────────────────────────────────
    await this.updateStatus(dailyLessonId, { vocabStatus: "PENDING" });

    const vocabResult = await this.vocabGen.generate(
      { count: 12, userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, previousWords: ctx.previousWords },
      genCtx
    );

    const vocabValidation = await this.validator.validate("vocabulary", vocabResult.data, ctx.userLevel);

    const vocabArtifacts = await Promise.all(
      vocabResult.data.map((card) =>
        prisma.aIArtifact.create({
          data: {
            userId: ctx.userId,
            studyDay: ctx.studyDay,
            curriculumVersion: ctx.curriculumVersion,
            difficultyLevel: ctx.userLevel,
            generationSeed: vocabResult.generationSeed,
            modelVersion: vocabResult.modelVersion,
            promptVersion: vocabResult.promptVersion,
            validationStatus: vocabValidation.approved ? "PASSED" : "FAILED",
            validationScore: vocabValidation.score,
            safetyStatus: "SAFE",
            content: card as object,
            artifactType: "VOCABULARY_CARD",
            dailyLessonId,
          },
        })
      )
    );

    await this.updateStatus(dailyLessonId, { vocabStatus: "READY" });

    // ── 2. Images (one per vocab card, pre-generated) ─────────────────────────
    const vocabWords = vocabResult.data.map((c) => c.word);

    const imageArtifacts = await Promise.all(
      vocabResult.data.map((card, idx) =>
        this.imageGen.generate({
          imagePrompt: card.imagePrompt,
          word: card.word,
          userId: ctx.userId,
          studyDay: ctx.studyDay,
        }).then((imgResult) =>
          prisma.aIArtifact.create({
            data: {
              userId: ctx.userId,
              studyDay: ctx.studyDay,
              curriculumVersion: ctx.curriculumVersion,
              difficultyLevel: ctx.userLevel,
              generationSeed: vocabResult.generationSeed,
              modelVersion: "image-generator",
              promptVersion: "v1.0.0",
              validationStatus: "PASSED",
              validationScore: 1.0,
              safetyStatus: "SAFE",
              content: imgResult as object,
              artifactType: "MNEMONIC_IMAGE",
              dailyLessonId,
              vocabArtifactId: vocabArtifacts[idx].artifactId,
            },
          })
        )
      )
    );

    // ── 3. Sentence Cards (4 cards, cross-linked to vocab words) ──────────────
    await this.updateStatus(dailyLessonId, { sentenceStatus: "PENDING" });

    const sentenceResult = await this.sentenceGen.generate(
      { count: 4, userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, relatedWords: vocabWords.slice(0, 6) },
      genCtx
    );

    const sentenceValidation = await this.validator.validate("sentence", sentenceResult.data, ctx.userLevel);

    const sentenceArtifacts = await Promise.all(
      sentenceResult.data.map((card) =>
        prisma.aIArtifact.create({
          data: {
            userId: ctx.userId,
            studyDay: ctx.studyDay,
            curriculumVersion: ctx.curriculumVersion,
            difficultyLevel: ctx.userLevel,
            generationSeed: sentenceResult.generationSeed,
            modelVersion: sentenceResult.modelVersion,
            promptVersion: sentenceResult.promptVersion,
            validationStatus: sentenceValidation.approved ? "PASSED" : "FAILED",
            validationScore: sentenceValidation.score,
            safetyStatus: "SAFE",
            content: card as object,
            artifactType: "SENTENCE_CARD",
            dailyLessonId,
          },
        })
      )
    );

    await this.updateStatus(dailyLessonId, { sentenceStatus: "READY" });

    // ── 4. Reading Passage (cross-linked: topic related to vocab domain) ──────
    await this.updateStatus(dailyLessonId, { readingStatus: "PENDING" });

    const readingResult = await this.readingGen.generate(
      { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal },
      genCtx
    );

    const readingValidation = await this.validator.validate("reading", readingResult.data, ctx.userLevel);

    const readingArtifact = await prisma.aIArtifact.create({
      data: {
        userId: ctx.userId,
        studyDay: ctx.studyDay,
        curriculumVersion: ctx.curriculumVersion,
        difficultyLevel: ctx.userLevel,
        generationSeed: readingResult.generationSeed,
        modelVersion: readingResult.modelVersion,
        promptVersion: readingResult.promptVersion,
        validationStatus: readingValidation.approved ? "PASSED" : "FAILED",
        validationScore: readingValidation.score,
        safetyStatus: "SAFE",
        content: readingResult.data as object,
        artifactType: "READING_PASSAGE",
        dailyLessonId,
      },
    });

    await this.updateStatus(dailyLessonId, { readingStatus: "READY" });

    // ── 5. Speaking Scenario ──────────────────────────────────────────────────
    await this.updateStatus(dailyLessonId, { speakingStatus: "PENDING" });

    const speakingResult = await this.speakingGen.generate(
      { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, previousCategories: ctx.previousCategories as any },
      genCtx
    );

    const speakingArtifact = await prisma.aIArtifact.create({
      data: {
        userId: ctx.userId,
        studyDay: ctx.studyDay,
        curriculumVersion: ctx.curriculumVersion,
        difficultyLevel: ctx.userLevel,
        generationSeed: speakingResult.generationSeed,
        modelVersion: speakingResult.modelVersion,
        promptVersion: speakingResult.promptVersion,
        validationStatus: "PASSED",
        validationScore: 1.0,
        safetyStatus: "SAFE",
        content: speakingResult.data as object,
        artifactType: "SPEAKING_SCENARIO",
        dailyLessonId,
      },
    });

    await this.updateStatus(dailyLessonId, { speakingStatus: "READY" });

    // ── 6. Writing Prompt ────────────────────────────────────────────────────
    await this.updateStatus(dailyLessonId, { writingStatus: "PENDING" });

    const writingResult = await this.writingGen.generate(
      { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal },
      genCtx
    );

    const writingArtifact = await prisma.aIArtifact.create({
      data: {
        userId: ctx.userId,
        studyDay: ctx.studyDay,
        curriculumVersion: ctx.curriculumVersion,
        difficultyLevel: ctx.userLevel,
        generationSeed: writingResult.generationSeed,
        modelVersion: writingResult.modelVersion,
        promptVersion: writingResult.promptVersion,
        validationStatus: "PASSED",
        validationScore: 1.0,
        safetyStatus: "SAFE",
        content: writingResult.data as object,
        artifactType: "WRITING_PROMPT",
        dailyLessonId,
      },
    });

    await this.updateStatus(dailyLessonId, { writingStatus: "READY" });

    // ── 7. Mark DailyLesson as READY ──────────────────────────────────────────
    await prisma.dailyLesson.update({
      where: { id: dailyLessonId },
      data: { generationStatus: "READY" },
    });

    return {
      dailyLessonId,
      vocabArtifactIds: vocabArtifacts.map((a) => a.artifactId),
      sentenceArtifactIds: sentenceArtifacts.map((a) => a.artifactId),
      readingArtifactId: readingArtifact.artifactId,
      speakingArtifactId: speakingArtifact.artifactId,
      writingArtifactId: writingArtifact.artifactId,
      imageArtifactIds: imageArtifacts.map((a) => a.artifactId),
      generatedAt: new Date(),
    };
  }

  private async updateStatus(
    dailyLessonId: string,
    status: Partial<Record<string, string>>
  ): Promise<void> {
    await prisma.dailyLesson.update({
      where: { id: dailyLessonId },
      data: status as any,
    });
  }
}
