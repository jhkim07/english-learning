import { LearningNode } from "@prisma/client";
import { prisma } from "@/lib/db";

const INITIAL_DIFFICULTY = 1.0;
const INITIAL_STAGE = 1;
const CORE_NODE_TYPES = ["VOCAB", "CONVERSATION", "READING", "WRITING"] as const;

/**
 * Creates the initial 4-node learning graph for a new user.
 * Nodes: VOCAB, CONVERSATION, READING, WRITING — all UNLOCKED, stage 1, no edges.
 */
export async function initializeUserGraph(userId: string): Promise<void> {
  await prisma.learningNode.createMany({
    data: CORE_NODE_TYPES.map((type) => ({
      userId,
      type,
      stage: INITIAL_STAGE,
      difficulty: INITIAL_DIFFICULTY,
      status: "UNLOCKED",
    })),
  });
}

/**
 * Marks a node as COMPLETED, creates a review node if score < 1.0,
 * and creates the next-stage node.
 */
export async function onNodeComplete(
  userId: string,
  nodeId: string,
  score: number,
  failedItems: string[]
): Promise<{ reviewNode: LearningNode | null; nextNode: LearningNode }> {
  // 1. Find the node
  const node = await prisma.learningNode.findFirst({ where: { id: nodeId, userId } });
  if (!node) throw new Error("Node not found");
  if (node.status === "COMPLETED") throw new Error("Already completed");

  // 2. Mark node as COMPLETED
  await prisma.learningNode.update({
    where: { id: nodeId },
    data: { status: "COMPLETED", score, completedAt: new Date() },
  });

  // 3. Optionally create a REVIEW node
  let reviewNode: LearningNode | null = null;

  if (score < 1.0) {
    // 3a. Collect reviewItems from previous REVIEW nodes for this user
    const previousReviewNodes = await prisma.learningNode.findMany({
      where: { userId, type: "REVIEW" },
    });

    // 3b. Merge previous hard items (excluding current failedItems), max 10
    const failedSet = new Set(failedItems);
    const previousHardItems: string[] = [];
    for (const rn of previousReviewNodes) {
      const items = Array.isArray(rn.reviewItems) ? (rn.reviewItems as string[]) : [];
      for (const item of items) {
        if (!failedSet.has(item)) {
          previousHardItems.push(item);
        }
      }
    }
    const deduped = Array.from(new Set(previousHardItems)).slice(0, 10);

    // 3c. Merge: failedItems first, then previousHardItems, max 20
    const mergedItems = Array.from(new Set([...failedItems, ...deduped])).slice(0, 20);

    // 3d. Create review node
    reviewNode = await prisma.learningNode.create({
      data: {
        userId,
        type: "REVIEW",
        stage: node.stage,
        difficulty: node.difficulty,
        status: "UNLOCKED",
        reviewItems: mergedItems,
      },
    });

    // 3e. Edge: current node → reviewNode
    await prisma.learningEdge.create({
      data: { userId, fromNodeId: nodeId, toNodeId: reviewNode.id },
    });

    // 3f. Edges: reviewNode → unlocked nodes of the other 3 core types
    const otherTypes = CORE_NODE_TYPES.filter((t) => t !== node.type);
    const otherUnlockedNodes = await prisma.learningNode.findMany({
      where: { userId, type: { in: otherTypes }, status: "UNLOCKED" },
    });

    for (const otherNode of otherUnlockedNodes) {
      await prisma.learningEdge.create({
        data: { userId, fromNodeId: reviewNode.id, toNodeId: otherNode.id },
      });
    }
  }

  // 4. Calculate next difficulty
  const rawDifficulty =
    score >= 0.75
      ? Math.min(Math.round((node.difficulty + 0.1) * 10) / 10, 5.0)
      : Math.max(Math.round((node.difficulty - 0.1) * 10) / 10, 1.0);

  // 5. Create next node
  const nextNode = await prisma.learningNode.create({
    data: {
      userId,
      type: node.type,
      stage: node.stage + 1,
      difficulty: rawDifficulty,
      status: reviewNode ? "LOCKED" : "UNLOCKED",
    },
  });

  // 6. Edge: current node → nextNode
  await prisma.learningEdge.create({
    data: { userId, fromNodeId: nodeId, toNodeId: nextNode.id },
  });

  // 7. Return
  return { reviewNode, nextNode };
}

/**
 * Returns the DailyLesson ID associated with a node.
 * If none exists, creates a new DailyLesson and links it.
 */
export async function getOrCreateLesson(
  userId: string,
  nodeId: string
): Promise<string> {
  // 1. Find node
  const node = await prisma.learningNode.findFirst({ where: { id: nodeId, userId } });
  if (!node) throw new Error("Node not found");

  // 2. Return existing lessonId if present
  if (node.dailyLessonId) return node.dailyLessonId;

  // 3. Create a new DailyLesson
  const existingCount = await prisma.dailyLesson.count({ where: { userId } });
  const today = new Date();
  const lesson = await prisma.dailyLesson.create({
    data: {
      userId,
      calendarDate: today,
      studyDay: existingCount + 1,
      generationStatus: "PENDING",
    },
  });

  // 4. Update the node with the new lessonId
  await prisma.learningNode.update({
    where: { id: nodeId },
    data: { dailyLessonId: lesson.id },
  });

  // 5. Return the new lesson id
  return lesson.id;
}
