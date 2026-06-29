-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('VOCAB', 'CONVERSATION', 'READING', 'WRITING', 'REVIEW');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "LearningNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "NodeStatus" NOT NULL DEFAULT 'UNLOCKED',
    "score" DOUBLE PRECISION,
    "reviewItems" JSONB NOT NULL DEFAULT '[]',
    "dailyLessonId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEdge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,

    CONSTRAINT "LearningEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningNode_dailyLessonId_key" ON "LearningNode"("dailyLessonId");

-- CreateIndex
CREATE INDEX "LearningNode_userId_type_stage_idx" ON "LearningNode"("userId", "type", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "LearningEdge_fromNodeId_toNodeId_key" ON "LearningEdge"("fromNodeId", "toNodeId");

-- CreateIndex
CREATE INDEX "LearningEdge_userId_idx" ON "LearningEdge"("userId");

-- AddForeignKey
ALTER TABLE "LearningNode" ADD CONSTRAINT "LearningNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningNode" ADD CONSTRAINT "LearningNode_dailyLessonId_fkey" FOREIGN KEY ("dailyLessonId") REFERENCES "DailyLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEdge" ADD CONSTRAINT "LearningEdge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEdge" ADD CONSTRAINT "LearningEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "LearningNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEdge" ADD CONSTRAINT "LearningEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "LearningNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
