import { prisma } from "@/lib/db";
import { DAILY_VOLUME } from "./constants";

export interface VolumeCheckResult {
  isValid: boolean;
  issues: string[];
  counts: {
    vocabCards: number;
    sentenceCards: number;
    readingQuestions: number;
    writingWordCount: number | null;
  };
}

export class FixedVolumeControlEngine {
  async checkLesson(dailyLessonId: string): Promise<VolumeCheckResult> {
    const artifacts = await prisma.aIArtifact.findMany({
      where: { dailyLessonId },
    });

    const vocabCount = artifacts.filter((a) => a.artifactType === "VOCABULARY_CARD").length;
    const sentenceCount = artifacts.filter((a) => a.artifactType === "SENTENCE_CARD").length;
    const readingPassages = artifacts.filter((a) => a.artifactType === "READING_PASSAGE");
    const writingPrompts = artifacts.filter((a) => a.artifactType === "WRITING_PROMPT");

    const issues: string[] = [];

    if (vocabCount !== DAILY_VOLUME.NEW_VOCAB_CARDS) {
      issues.push(`Expected ${DAILY_VOLUME.NEW_VOCAB_CARDS} vocab cards, found ${vocabCount}`);
    }

    if (sentenceCount !== DAILY_VOLUME.SENTENCE_CARDS) {
      issues.push(`Expected ${DAILY_VOLUME.SENTENCE_CARDS} sentence cards, found ${sentenceCount}`);
    }

    if (readingPassages.length === 0) {
      issues.push("Missing reading passage");
    } else {
      const passage = readingPassages[0].content as { questions?: unknown[]; wordCount?: number };
      const questionCount = passage.questions?.length ?? 0;
      if (questionCount !== DAILY_VOLUME.READING_CORE_QUESTIONS) {
        issues.push(`Expected ${DAILY_VOLUME.READING_CORE_QUESTIONS} reading questions, found ${questionCount}`);
      }
    }

    // Check writing word count if submission exists (only checked at submission time, not generation)
    let writingWordCount: number | null = null;
    if (writingPrompts.length === 0) {
      issues.push("Missing writing prompt");
    }

    return {
      isValid: issues.length === 0,
      issues,
      counts: {
        vocabCards: vocabCount,
        sentenceCards: sentenceCount,
        readingQuestions:
          readingPassages.length > 0
            ? ((readingPassages[0].content as { questions?: unknown[] }).questions?.length ?? 0)
            : 0,
        writingWordCount,
      },
    };
  }

  validateWritingWordCount(wordCount: number): { valid: boolean; issue?: string } {
    if (wordCount < DAILY_VOLUME.WRITING_MIN_WORDS) {
      return { valid: false, issue: `Writing is ${wordCount} words (minimum ${DAILY_VOLUME.WRITING_MIN_WORDS})` };
    }
    if (wordCount > DAILY_VOLUME.WRITING_MAX_WORDS) {
      return { valid: false, issue: `Writing is ${wordCount} words (maximum ${DAILY_VOLUME.WRITING_MAX_WORDS})` };
    }
    return { valid: true };
  }

  validateConversationTurns(turnCount: number): { valid: boolean; issue?: string } {
    if (turnCount < DAILY_VOLUME.CONVERSATION_MIN_TURNS) {
      return {
        valid: false,
        issue: `Conversation needs ${DAILY_VOLUME.CONVERSATION_MIN_TURNS - turnCount} more turns (minimum ${DAILY_VOLUME.CONVERSATION_MIN_TURNS})`,
      };
    }
    return { valid: true };
  }
}
