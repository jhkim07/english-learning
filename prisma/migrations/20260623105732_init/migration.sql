-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PARTIAL', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('VOCABULARY_CARD', 'SENTENCE_CARD', 'MNEMONIC_IMAGE', 'READING_PASSAGE', 'READING_QUESTION', 'ADAPTIVE_QUESTION', 'SPEAKING_SCENARIO', 'WRITING_PROMPT', 'EVALUATION_RESULT');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('PENDING', 'SAFE', 'FLAGGED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('GENERATE_DAILY_PACKAGE', 'GENERATE_VOCABULARY', 'GENERATE_SENTENCE_CARDS', 'GENERATE_READING', 'GENERATE_SPEAKING_SCENARIO', 'GENERATE_WRITING_PROMPT', 'GENERATE_MNEMONIC_IMAGES');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('VOCABULARY', 'SENTENCE', 'REVIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "studyGoal" TEXT,
    "dailyTargetMinutes" INTEGER NOT NULL DEFAULT 50,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "diagnosisAnswers" JSONB,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCurriculum" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "theme" TEXT,
    "vocabDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCurriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "studyDay" INTEGER NOT NULL,
    "calendarDate" DATE NOT NULL,
    "generationStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "frozenAt" TIMESTAMP(3),
    "vocabStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "sentenceStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "readingStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "speakingStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "writingStatus" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "sessionStartedAt" TIMESTAMP(3),
    "sessionCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIArtifact" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "artifactType" "ArtifactType" NOT NULL,
    "studyDay" INTEGER NOT NULL,
    "curriculumVersion" INTEGER NOT NULL,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 1,
    "generationSeed" TEXT,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationScore" DOUBLE PRECISION,
    "safetyStatus" "SafetyStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB NOT NULL,

    CONSTRAINT "AIArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "bullmqJobId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLessonId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "response" INTEGER NOT NULL,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCurriculum_userId_month_year_key" ON "MonthlyCurriculum"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyCurriculum_userId_idx" ON "MonthlyCurriculum"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLesson_userId_calendarDate_key" ON "DailyLesson"("userId", "calendarDate");

-- CreateIndex
CREATE INDEX "DailyLesson_userId_studyDay_idx" ON "DailyLesson"("userId", "studyDay");

-- CreateIndex
CREATE INDEX "DailyLesson_userId_calendarDate_idx" ON "DailyLesson"("userId", "calendarDate");

-- CreateIndex
CREATE UNIQUE INDEX "AIArtifact_artifactId_key" ON "AIArtifact"("artifactId");

-- CreateIndex
CREATE INDEX "AIArtifact_userId_dailyLessonId_idx" ON "AIArtifact"("userId", "dailyLessonId");

-- CreateIndex
CREATE INDEX "AIArtifact_userId_artifactType_idx" ON "AIArtifact"("userId", "artifactType");

-- CreateIndex
CREATE INDEX "AIArtifact_dailyLessonId_artifactType_idx" ON "AIArtifact"("dailyLessonId", "artifactType");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_dailyLessonId_idx" ON "GenerationJob"("userId", "dailyLessonId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_scheduledFor_idx" ON "GenerationJob"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_name_version_key" ON "PromptVersion"("name", "version");

-- CreateIndex
CREATE INDEX "PromptVersion_name_isActive_idx" ON "PromptVersion"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_modelId_key" ON "ModelVersion"("modelId");

-- CreateIndex
CREATE INDEX "FlashcardAttempt_userId_dailyLessonId_idx" ON "FlashcardAttempt"("userId", "dailyLessonId");

-- CreateIndex
CREATE INDEX "FlashcardAttempt_userId_cardType_idx" ON "FlashcardAttempt"("userId", "cardType");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCurriculum" ADD CONSTRAINT "MonthlyCurriculum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLesson" ADD CONSTRAINT "DailyLesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLesson" ADD CONSTRAINT "DailyLesson_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "MonthlyCurriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIArtifact" ADD CONSTRAINT "AIArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIArtifact" ADD CONSTRAINT "AIArtifact_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardAttempt" ADD CONSTRAINT "FlashcardAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardAttempt" ADD CONSTRAINT "FlashcardAttempt_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
