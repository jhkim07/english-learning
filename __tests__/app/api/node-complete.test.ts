// Tests for POST /api/nodes/[nodeId]/complete
// Covers: 401 unauth, 404 IDOR, 409 already completed, 200 success (no review), 200 success (with review), 409 from engine throw

const mockAuth = jest.fn();
const mockFindFirst = jest.fn();
const mockOnNodeComplete = jest.fn();

jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    learningNode: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/engines/graph-engine", () => ({
  onNodeComplete: (...args: unknown[]) => mockOnNodeComplete(...args),
}));

import { POST } from "@/app/api/nodes/[nodeId]/complete/route";

// Helper to build a Request with JSON body and route params
function makeRequest(nodeId: string, body: object = { score: 1.0, failedItems: [] }) {
  const req = new Request(`http://localhost/api/nodes/${nodeId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { req, params: { nodeId } };
}

const MOCK_NEXT_NODE = {
  id: "node-2",
  userId: "user-1",
  type: "VOCAB",
  stage: 2,
  difficulty: 1.1,
  status: "UNLOCKED",
  score: null,
  reviewItems: [],
  dailyLessonId: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_REVIEW_NODE = {
  id: "node-review",
  userId: "user-1",
  type: "REVIEW",
  stage: 1,
  difficulty: 1.0,
  status: "UNLOCKED",
  score: null,
  reviewItems: ["item-1"],
  dailyLessonId: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/nodes/[nodeId]/complete", () => {
  it("returns 401 when unauthenticated (auth returns null)", async () => {
    mockAuth.mockResolvedValue(null);

    const { req, params } = makeRequest("node-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const { req, params } = makeRequest("node-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when node not found or belongs to another user (IDOR protection)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue(null);

    const { req, params } = makeRequest("node-99");
    const response = await POST(req, { params });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Not found");

    // Confirm IDOR query includes userId
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "node-99",
          userId: "user-1",
        }),
      })
    );
  });

  it("returns 409 when node status is COMPLETED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "node-1", userId: "user-1", status: "COMPLETED" });

    const { req, params } = makeRequest("node-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already completed");
  });

  it("returns 200 with graphDelta.created having 1 item when reviewNode is null (perfect score)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "node-1", userId: "user-1", status: "UNLOCKED" });
    mockOnNodeComplete.mockResolvedValue({ reviewNode: null, nextNode: MOCK_NEXT_NODE });

    const { req, params } = makeRequest("node-1", { score: 1.0, failedItems: [] });
    const response = await POST(req, { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reviewNode).toBeNull();
    expect(body.nextNode.id).toBe("node-2");
    expect(body.graphDelta.created).toHaveLength(1);
    expect(body.graphDelta.created[0].node.id).toBe("node-2");

    expect(mockOnNodeComplete).toHaveBeenCalledWith("user-1", "node-1", 1.0, []);
  });

  it("returns 200 with graphDelta.created having 2 items when reviewNode is present (failed items)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "node-1", userId: "user-1", status: "UNLOCKED" });
    mockOnNodeComplete.mockResolvedValue({
      reviewNode: MOCK_REVIEW_NODE,
      nextNode: MOCK_NEXT_NODE,
    });

    const { req, params } = makeRequest("node-1", { score: 0.7, failedItems: ["item-1"] });
    const response = await POST(req, { params });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reviewNode.id).toBe("node-review");
    expect(body.nextNode.id).toBe("node-2");
    expect(body.graphDelta.created).toHaveLength(2);
    // reviewNode should be first
    expect(body.graphDelta.created[0].node.id).toBe("node-review");
    expect(body.graphDelta.created[1].node.id).toBe("node-2");

    expect(mockOnNodeComplete).toHaveBeenCalledWith("user-1", "node-1", 0.7, ["item-1"]);
  });

  it("returns 409 when onNodeComplete throws 'Already completed'", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "node-1", userId: "user-1", status: "UNLOCKED" });
    mockOnNodeComplete.mockRejectedValue(new Error("Already completed"));

    const { req, params } = makeRequest("node-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Already completed");
  });

  it("returns 500 on unexpected errors from onNodeComplete", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ id: "node-1", userId: "user-1", status: "UNLOCKED" });
    mockOnNodeComplete.mockRejectedValue(new Error("DB connection lost"));

    const { req, params } = makeRequest("node-1");
    const response = await POST(req, { params });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});
