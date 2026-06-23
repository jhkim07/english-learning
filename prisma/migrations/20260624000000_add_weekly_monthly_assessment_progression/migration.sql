-- CreateTable
CREATE TABLE "WeeklyAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "correctItems" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "correctItems" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL,
    "nextLevel" INTEGER,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyAssessment_userId_idx" ON "WeeklyAssessment"("userId");

-- CreateIndex
CREATE INDEX "WeeklyAssessment_userId_weekNumber_idx" ON "WeeklyAssessment"("userId", "weekNumber");

-- CreateIndex
CREATE INDEX "MonthlyExam_userId_idx" ON "MonthlyExam"("userId");

-- CreateIndex
CREATE INDEX "ProgressionDecision_userId_idx" ON "ProgressionDecision"("userId");
