import { prisma } from "@/lib/db";
import { VocabularyGenerator } from "@/lib/ai/generators/vocabulary";
import { SentenceCardGenerator } from "@/lib/ai/generators/sentence";
import { ReadingGenerator } from "@/lib/ai/generators/reading";
import { SpeakingScenarioGenerator } from "@/lib/ai/generators/speaking";
import { WritingGenerator } from "@/lib/ai/generators/writing";
import { ImageGenerator } from "@/lib/ai/generators/image";
import { ValidationAgent } from "@/lib/ai/validation-agent";
import { getVocabFromDB, getReadingFromDB } from "@/lib/content/content-db";
import { calibrateVocab, calibrateReading, calibrateConversation, calibrateWriting } from "@/lib/engines/difficulty-calibrator";
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
    // ── 0. Read or create LevelProfile (upsert — creates with defaults if first time) ──
    const levelProfileDB = await prisma.levelProfile.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId },
      update: {},
    });

    // pendingReviewItems guard (T7): JSON parse failure → empty array
    const pendingReviewItems: string[] = Array.isArray(levelProfileDB.pendingReviewItems)
      ? (levelProfileDB.pendingReviewItems as string[])
      : [];

    // Use ctx.levelProfile if already passed in (from generation-runner), else use DB read
    const effectiveLevel = ctx.levelProfile ?? {
      vocabulary: levelProfileDB.vocabulary,
      conversation: levelProfileDB.conversation,
      reading: levelProfileDB.reading,
      writing: levelProfileDB.writing,
      pendingReviewItems,
    };

    // Calibrate per-domain parameters
    const vocabParams = calibrateVocab(effectiveLevel.vocabulary);
    calibrateReading(effectiveLevel.reading);
    calibrateConversation(effectiveLevel.conversation);
    calibrateWriting(effectiveLevel.writing);

    const genCtx: GenerationContext = {
      userId: ctx.userId,
      studyDay: ctx.studyDay ?? 1,
      curriculumVersion: ctx.curriculumVersion ?? 1,
      difficultyLevel: effectiveLevel.vocabulary,  // use vocabulary level as primary (Float)
      userLevel: ctx.userLevel,
      studyGoal: ctx.studyGoal,
    };

    // vocabParams available for future use (V2: inject into generator prompts)
    void vocabParams;

    // ── 1. Vocabulary (12 cards) ── DB-first, AI fallback ────────────────────
    await this.updateStatus(dailyLessonId, { vocabStatus: "PENDING" });

    const dbVocab = await getVocabFromDB(12, ctx.previousWords ?? [], ctx.userLevel);

    let vocabCards = dbVocab;
    let vocabMeta = { generationSeed: "db", modelVersion: "content-bank-v1", promptVersion: "v1.0.0" };

    if (!dbVocab) {
      // DB doesn't have enough content yet — fall back to AI
      const aiResult = await this.vocabGen.generate(
        { count: 12, userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, previousWords: ctx.previousWords },
        genCtx
      );
      vocabCards = aiResult.data;
      vocabMeta = { generationSeed: aiResult.generationSeed, modelVersion: aiResult.modelVersion, promptVersion: aiResult.promptVersion };
    }

    const vocabValidation = await this.validator.validate("vocabulary", vocabCards!, ctx.userLevel);

    const vocabArtifacts = await Promise.all(
      vocabCards!.map((card) =>
        prisma.aIArtifact.create({
          data: {
            userId: ctx.userId,
            studyDay: ctx.studyDay ?? 1,
            curriculumVersion: ctx.curriculumVersion ?? 1,
            difficultyLevel: ctx.userLevel,
            generationSeed: vocabMeta.generationSeed,
            modelVersion: vocabMeta.modelVersion,
            promptVersion: vocabMeta.promptVersion,
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
    const vocabWords = vocabCards!.map((c) => c.word);

    const imageArtifacts = await Promise.all(
      vocabCards!.map((card, idx) =>
        this.imageGen.generate({
          imagePrompt: card.imagePrompt,
          word: card.word,
          userId: ctx.userId,
          studyDay: ctx.studyDay ?? 1,
        }).then((imgResult) =>
          prisma.aIArtifact.create({
            data: {
              userId: ctx.userId,
              studyDay: ctx.studyDay ?? 1,
              curriculumVersion: ctx.curriculumVersion ?? 1,
              difficultyLevel: ctx.userLevel,
              generationSeed: vocabMeta.generationSeed,
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
            studyDay: ctx.studyDay ?? 1,
            curriculumVersion: ctx.curriculumVersion ?? 1,
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

    // ── 4. Reading Passage ── DB-first (passage only), AI generates questions ──
    await this.updateStatus(dailyLessonId, { readingStatus: "PENDING" });

    const dbPassage = await getReadingFromDB(ctx.userLevel);
    let readingData: import("@/lib/ai/generators/reading/types").ReadingPassage;
    let readingMeta = { generationSeed: "db", modelVersion: "content-bank-v1", promptVersion: "v1.0.0" };

    if (dbPassage) {
      // Passage from DB — AI only generates the 6 core questions
      const questionsResult = await this.readingGen.generate(
        { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, topic: dbPassage.topic, passageOverride: dbPassage.passage },
        genCtx
      );
      readingData = { ...questionsResult.data, title: dbPassage.title, passage: dbPassage.passage, wordCount: dbPassage.wordCount, topic: dbPassage.topic };
      readingMeta = { generationSeed: `db+${questionsResult.generationSeed}`, modelVersion: questionsResult.modelVersion, promptVersion: questionsResult.promptVersion };
    } else {
      // DB empty — full AI generation
      const aiResult = await this.readingGen.generate(
        { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal },
        genCtx
      );
      readingData = aiResult.data;
      readingMeta = { generationSeed: aiResult.generationSeed, modelVersion: aiResult.modelVersion, promptVersion: aiResult.promptVersion };
    }

    const readingValidation = await this.validator.validate("reading", readingData, ctx.userLevel);

    const readingArtifact = await prisma.aIArtifact.create({
      data: {
        userId: ctx.userId,
        studyDay: ctx.studyDay ?? 1,
        curriculumVersion: ctx.curriculumVersion ?? 1,
        difficultyLevel: ctx.userLevel,
        generationSeed: readingMeta.generationSeed,
        modelVersion: readingMeta.modelVersion,
        promptVersion: readingMeta.promptVersion,
        validationStatus: readingValidation.approved ? "PASSED" : "FAILED",
        validationScore: readingValidation.score,
        safetyStatus: "SAFE",
        content: readingData as object,
        artifactType: "READING_PASSAGE",
        dailyLessonId,
      },
    });

    await this.updateStatus(dailyLessonId, { readingStatus: "READY" });

    // ── 5. Speaking Scenarios (2 different situations) ────────────────────────
    await this.updateStatus(dailyLessonId, { speakingStatus: "PENDING" });

    const speakingArtifacts: { artifactId: string }[] = [];
    const usedCategories = [...ctx.previousCategories];

    for (let i = 0; i < 2; i++) {
      const speakingResult = await this.speakingGen.generate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { userLevel: ctx.userLevel, studyGoal: ctx.studyGoal, previousCategories: usedCategories as any },
        genCtx
      );

      usedCategories.push(speakingResult.data.category);

      const speakingArtifact = await prisma.aIArtifact.create({
        data: {
          userId: ctx.userId,
          studyDay: ctx.studyDay ?? 1,
          curriculumVersion: ctx.curriculumVersion ?? 1,
          difficultyLevel: ctx.userLevel,
          generationSeed: `${speakingResult.generationSeed}-${i + 1}`,
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

      speakingArtifacts.push(speakingArtifact);
    }

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
        studyDay: ctx.studyDay ?? 1,
        curriculumVersion: ctx.curriculumVersion ?? 1,
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
      speakingArtifactId: speakingArtifacts[0].artifactId,
      speakingArtifactIds: speakingArtifacts.map((a) => a.artifactId),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: status as any,
    });
  }
}
