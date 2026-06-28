-- CreateEnum
CREATE TYPE "LevelArea" AS ENUM ('VOCABULARY', 'CONVERSATION', 'READING', 'WRITING');

-- CreateEnum
CREATE TYPE "LevelChangeReason" AS ENUM ('ALL_PASSED', 'AREA_FAILED', 'INITIAL');

-- AlterTable: DailyLesson.curriculumId becomes optional
ALTER TABLE "DailyLesson" ALTER COLUMN "curriculumId" DROP NOT NULL;

-- AlterTable: AIArtifact.difficultyLevel Int -> Float
ALTER TABLE "AIArtifact" ALTER COLUMN "difficultyLevel" TYPE DOUBLE PRECISION USING "difficultyLevel"::DOUBLE PRECISION;

-- CreateTable: LevelProfile
CREATE TABLE "LevelProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabulary" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "conversation" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reading" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "writing" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "pendingReviewItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LevelHistory
CREATE TABLE "LevelHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" "LevelArea" NOT NULL,
    "fromLevel" DOUBLE PRECISION NOT NULL,
    "toLevel" DOUBLE PRECISION NOT NULL,
    "reason" "LevelChangeReason" NOT NULL,
    "dailyLessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReadingAttempt
CREATE TABLE "ReadingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SpeakingEvaluation
CREATE TABLE "SpeakingEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WritingSubmission
CREATE TABLE "WritingSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "evaluationScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LevelProfile_userId_key" ON "LevelProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelHistory_userId_dailyLessonId_area_key" ON "LevelHistory"("userId", "dailyLessonId", "area");

-- CreateIndex
CREATE INDEX "LevelHistory_userId_area_idx" ON "LevelHistory"("userId", "area");

-- CreateIndex
CREATE INDEX "LevelHistory_userId_createdAt_idx" ON "LevelHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingAttempt_userId_dailyLessonId_idx" ON "ReadingAttempt"("userId", "dailyLessonId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingEvaluation_userId_dailyLessonId_key" ON "SpeakingEvaluation"("userId", "dailyLessonId");

-- CreateIndex
CREATE INDEX "SpeakingEvaluation_userId_dailyLessonId_idx" ON "SpeakingEvaluation"("userId", "dailyLessonId");

-- CreateIndex
CREATE INDEX "WritingSubmission_userId_dailyLessonId_idx" ON "WritingSubmission"("userId", "dailyLessonId");

-- AddForeignKey
ALTER TABLE "LevelProfile" ADD CONSTRAINT "LevelProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelHistory" ADD CONSTRAINT "LevelHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAttempt" ADD CONSTRAINT "ReadingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAttempt" ADD CONSTRAINT "ReadingAttempt_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEvaluation" ADD CONSTRAINT "SpeakingEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEvaluation" ADD CONSTRAINT "SpeakingEvaluation_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
