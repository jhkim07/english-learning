-- Add unique constraint on WritingSubmission(userId, dailyLessonId)
-- Prevents duplicate rows when a learner revises their writing submission
ALTER TABLE "WritingSubmission" DROP CONSTRAINT IF EXISTS "WritingSubmission_userId_dailyLessonId_idx";
DROP INDEX IF EXISTS "WritingSubmission_userId_dailyLessonId_idx";
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_userId_dailyLessonId_key" UNIQUE ("userId", "dailyLessonId");
