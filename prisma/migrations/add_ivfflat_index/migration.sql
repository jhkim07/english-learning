-- Create ivfflat index for approximate nearest neighbor search
-- lists=100 is appropriate for tables up to ~1M rows
-- Run manually: this migration cannot run inside a Prisma transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_artifact_embedding_idx
ON "AIArtifact"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
