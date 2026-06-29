-- Add PARTIAL_PASS value to LevelChangeReason enum
-- Used when an area passed but another area failed (so no ALL_PASSED level-up bonus applies)
ALTER TYPE "LevelChangeReason" ADD VALUE 'PARTIAL_PASS';
