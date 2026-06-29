import { NodeStatus, NodeType } from "@prisma/client";
import {
  initializeUserGraph,
  onNodeComplete,
  getOrCreateLesson,
} from "@/lib/engines/graph-engine";

// Mock @/lib/db fully — no real DB calls
jest.mock("@/lib/db", () => ({
  prisma: {
    learningNode: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    learningEdge: {
      create: jest.fn(),
    },
    dailyLesson: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const MOCK_USER_ID = "user-test-123";

function makeNode(
  overrides: Partial<{
    id: string;
    userId: string;
    type: NodeType;
    stage: number;
    difficulty: number;
    status: NodeStatus;
    score: number | null;
    reviewItems: string[];
    dailyLessonId: string | null;
    completedAt: Date | null;
    createdAt: Date;
  }> = {}
) {
  return {
    id: "node-1",
    userId: MOCK_USER_ID,
    type: NodeType.VOCAB,
    stage: 1,
    difficulty: 2.0,
    status: NodeStatus.UNLOCKED,
    score: null,
    reviewItems: [],
    dailyLessonId: null,
    completedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("initializeUserGraph", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates 4 nodes (VOCAB/CONVERSATION/READING/WRITING), all UNLOCKED, no edges", async () => {
    (prisma.learningNode.createMany as jest.Mock).mockResolvedValue({ count: 4 });

    await initializeUserGraph(MOCK_USER_ID);

    expect(prisma.learningNode.createMany).toHaveBeenCalledTimes(1);
    const call = (prisma.learningNode.createMany as jest.Mock).mock.calls[0][0];
    const data: Array<{
      userId: string;
      type: NodeType;
      stage: number;
      difficulty: number;
      status: NodeStatus;
    }> = call.data;

    expect(data).toHaveLength(4);

    const types = data.map((n) => n.type).sort();
    expect(types).toEqual(
      [NodeType.CONVERSATION, NodeType.READING, NodeType.VOCAB, NodeType.WRITING].sort()
    );

    for (const node of data) {
      expect(node.userId).toBe(MOCK_USER_ID);
      expect(node.status).toBe(NodeStatus.UNLOCKED);
      expect(node.stage).toBe(1);
    }

    // No edges created during init
    expect(prisma.learningEdge.create).not.toHaveBeenCalled();
  });
});

describe("onNodeComplete — perfect score (1.0)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns reviewNode=null, nextNode UNLOCKED, nextNode.stage = previous+1", async () => {
    const currentNode = makeNode({ id: "node-1", stage: 3, difficulty: 2.0 });
    const nextNodeMock = makeNode({
      id: "node-2",
      stage: 4,
      difficulty: 2.1,
      status: NodeStatus.UNLOCKED,
    });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(currentNode);
    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...currentNode,
      status: NodeStatus.COMPLETED,
    });
    (prisma.learningNode.create as jest.Mock).mockResolvedValue(nextNodeMock);
    (prisma.learningEdge.create as jest.Mock).mockResolvedValue({ id: "edge-1" });

    const result = await onNodeComplete(MOCK_USER_ID, "node-1", 1.0, []);

    expect(result.reviewNode).toBeNull();
    expect(result.nextNode.status).toBe(NodeStatus.UNLOCKED);
    expect(result.nextNode.stage).toBe(4);

    // Only one edge: current → nextNode
    expect(prisma.learningEdge.create).toHaveBeenCalledTimes(1);
  });
});

describe("onNodeComplete — partial score (0.8)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates reviewNode, nextNode is LOCKED, reviewNode has failedItems", async () => {
    const currentNode = makeNode({
      id: "node-vocab",
      type: NodeType.VOCAB,
      stage: 2,
      difficulty: 2.0,
    });

    // 3 unlocked nodes of the OTHER types
    const convNode = makeNode({ id: "node-conv", type: NodeType.CONVERSATION });
    const readNode = makeNode({ id: "node-read", type: NodeType.READING });
    const writeNode = makeNode({ id: "node-write", type: NodeType.WRITING });

    const reviewNodeMock = makeNode({
      id: "node-review",
      type: NodeType.REVIEW,
      status: NodeStatus.UNLOCKED,
      reviewItems: ["item-A", "item-B"],
    });
    const nextNodeMock = makeNode({
      id: "node-next",
      stage: 3,
      status: NodeStatus.LOCKED,
    });

    // findFirst: for the current node
    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(currentNode);
    // findMany: previous REVIEW nodes (none) + 3 other-type UNLOCKED nodes
    (prisma.learningNode.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // previous REVIEW nodes
      .mockResolvedValueOnce([convNode, readNode, writeNode]); // unlocked non-VOCAB nodes

    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...currentNode,
      status: NodeStatus.COMPLETED,
    });
    (prisma.learningNode.create as jest.Mock)
      .mockResolvedValueOnce(reviewNodeMock) // review node
      .mockResolvedValueOnce(nextNodeMock); // next node
    (prisma.learningEdge.create as jest.Mock).mockResolvedValue({ id: "edge-x" });

    const result = await onNodeComplete(MOCK_USER_ID, "node-vocab", 0.8, [
      "item-A",
      "item-B",
    ]);

    expect(result.reviewNode).not.toBeNull();
    expect(result.nextNode.status).toBe(NodeStatus.LOCKED);

    // Verify reviewNode was created with failedItems
    const createCalls = (prisma.learningNode.create as jest.Mock).mock.calls;
    const reviewCreateCall = createCalls[0][0].data;
    expect(reviewCreateCall.type).toBe(NodeType.REVIEW);
    expect(reviewCreateCall.reviewItems).toContain("item-A");
    expect(reviewCreateCall.reviewItems).toContain("item-B");

    // 3 cross-edges: reviewNode → convNode, reviewNode → readNode, reviewNode → writeNode
    // + 1 edge: currentNode → reviewNode
    // + 1 edge: currentNode → nextNode
    // total = 5 edges
    expect(prisma.learningEdge.create).toHaveBeenCalledTimes(5);
  });
});

describe("onNodeComplete — low score (0.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("decreases nextDifficulty by 0.1", async () => {
    const currentNode = makeNode({
      id: "node-1",
      type: NodeType.READING,
      stage: 5,
      difficulty: 2.0,
    });
    const reviewNodeMock = makeNode({ id: "node-review", type: NodeType.REVIEW });
    const nextNodeMock = makeNode({ id: "node-next", stage: 6, difficulty: 1.9 });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(currentNode);
    (prisma.learningNode.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // previous REVIEW nodes
      .mockResolvedValueOnce([]); // other type nodes
    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...currentNode,
      status: NodeStatus.COMPLETED,
    });
    (prisma.learningNode.create as jest.Mock)
      .mockResolvedValueOnce(reviewNodeMock)
      .mockResolvedValueOnce(nextNodeMock);
    (prisma.learningEdge.create as jest.Mock).mockResolvedValue({ id: "edge-x" });

    await onNodeComplete(MOCK_USER_ID, "node-1", 0.6, ["item-x"]);

    const createCalls = (prisma.learningNode.create as jest.Mock).mock.calls;
    // Second create is nextNode
    const nextCreateData = createCalls[1][0].data;
    expect(nextCreateData.difficulty).toBeCloseTo(1.9, 5);
  });
});

describe("onNodeComplete — difficulty clamp upper bound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("difficulty=5.0 + score=1.0 → nextDifficulty clamped to 5.0", async () => {
    const currentNode = makeNode({
      id: "node-1",
      type: NodeType.WRITING,
      stage: 10,
      difficulty: 5.0,
    });
    const nextNodeMock = makeNode({ id: "node-next", stage: 11, difficulty: 5.0 });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(currentNode);
    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...currentNode,
      status: NodeStatus.COMPLETED,
    });
    (prisma.learningNode.create as jest.Mock).mockResolvedValue(nextNodeMock);
    (prisma.learningEdge.create as jest.Mock).mockResolvedValue({ id: "edge-x" });

    await onNodeComplete(MOCK_USER_ID, "node-1", 1.0, []);

    const createCalls = (prisma.learningNode.create as jest.Mock).mock.calls;
    const nextCreateData = createCalls[0][0].data;
    expect(nextCreateData.difficulty).toBe(5.0);
  });
});

describe("onNodeComplete — difficulty clamp lower bound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("difficulty=1.0 + score=0.6 → nextDifficulty clamped to 1.0", async () => {
    const currentNode = makeNode({
      id: "node-1",
      type: NodeType.VOCAB,
      stage: 1,
      difficulty: 1.0,
    });
    const reviewNodeMock = makeNode({ id: "node-review", type: NodeType.REVIEW });
    const nextNodeMock = makeNode({ id: "node-next", stage: 2, difficulty: 1.0 });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(currentNode);
    (prisma.learningNode.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // previous REVIEW nodes
      .mockResolvedValueOnce([]); // other type nodes
    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...currentNode,
      status: NodeStatus.COMPLETED,
    });
    (prisma.learningNode.create as jest.Mock)
      .mockResolvedValueOnce(reviewNodeMock)
      .mockResolvedValueOnce(nextNodeMock);
    (prisma.learningEdge.create as jest.Mock).mockResolvedValue({ id: "edge-x" });

    await onNodeComplete(MOCK_USER_ID, "node-1", 0.6, ["item-x"]);

    const createCalls = (prisma.learningNode.create as jest.Mock).mock.calls;
    const nextCreateData = createCalls[1][0].data;
    expect(nextCreateData.difficulty).toBe(1.0);
  });
});

describe("onNodeComplete — already completed node", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws Error('Already completed') when node status is COMPLETED", async () => {
    const completedNode = makeNode({
      id: "node-done",
      status: NodeStatus.COMPLETED,
    });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(completedNode);

    await expect(
      onNodeComplete(MOCK_USER_ID, "node-done", 0.9, [])
    ).rejects.toThrow("Already completed");
  });
});

describe("getOrCreateLesson — dailyLessonId exists", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns existing dailyLessonId without creating a new DailyLesson", async () => {
    const nodeWithLesson = makeNode({
      id: "node-1",
      dailyLessonId: "lesson-existing-id",
    });

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(nodeWithLesson);

    const result = await getOrCreateLesson(MOCK_USER_ID, "node-1");

    expect(result).toBe("lesson-existing-id");
    expect(prisma.dailyLesson.create).not.toHaveBeenCalled();
    expect(prisma.learningNode.update).not.toHaveBeenCalled();
  });
});

describe("getOrCreateLesson — no dailyLessonId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates DailyLesson and updates the node with the new lessonId", async () => {
    const nodeWithoutLesson = makeNode({
      id: "node-1",
      dailyLessonId: null,
    });
    const newLesson = { id: "lesson-new-id" };

    (prisma.learningNode.findFirst as jest.Mock).mockResolvedValue(nodeWithoutLesson);
    (prisma.dailyLesson.create as jest.Mock).mockResolvedValue(newLesson);
    (prisma.learningNode.update as jest.Mock).mockResolvedValue({
      ...nodeWithoutLesson,
      dailyLessonId: "lesson-new-id",
    });

    const result = await getOrCreateLesson(MOCK_USER_ID, "node-1");

    expect(result).toBe("lesson-new-id");
    expect(prisma.dailyLesson.create).toHaveBeenCalledTimes(1);
    expect(prisma.learningNode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "node-1" },
        data: expect.objectContaining({ dailyLessonId: "lesson-new-id" }),
      })
    );
  });
});
