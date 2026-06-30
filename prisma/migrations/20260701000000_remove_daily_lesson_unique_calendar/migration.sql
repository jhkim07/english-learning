-- Remove the unique constraint that prevents multiple lessons per calendar day (V2 node-graph needs one lesson per node)
DROP INDEX IF EXISTS "DailyLesson_userId_calendarDate_key";
