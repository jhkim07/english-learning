// Mock dependencies
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    dailyLesson: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    aIArtifact: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/dev-bypass", () => ({
  DEV_BYPASS_AUTH: true, // Use dev bypass in tests
  DEV_USER_ID: "dev-user-id",
}));

import { POST } from "@/app/api/daily-lesson/freeze/route";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/daily-lesson/freeze", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/daily-lesson/freeze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when lesson not found", async () => {
    (prisma.dailyLesson.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ dailyLessonId: "nonexistent-id" });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("freezes lesson and returns artifacts on first open", async () => {
    const mockLesson = {
      id: "lesson-1",
      frozenAt: null,
      studyDay: 1,
      curriculum: { userId: "dev-user-id" },
    };

    (prisma.dailyLesson.findFirst as jest.Mock).mockResolvedValue(mockLesson);
    (prisma.dailyLesson.update as jest.Mock).mockResolvedValue({ ...mockLesson, frozenAt: new Date(), isOpen: true });
    (prisma.aIArtifact.findMany as jest.Mock).mockResolvedValue([
      { artifactId: "art-1", artifactType: "VOCABULARY_CARD", content: { word: "leverage" }, validationStatus: "PASSED" },
      { artifactId: "art-2", artifactType: "READING_PASSAGE", content: { title: "Remote Work" }, validationStatus: "PASSED" },
    ]);

    const req = makeRequest({ dailyLessonId: "lesson-1" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.frozenAt).toBeTruthy();
    expect(prisma.dailyLesson.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lesson-1" } })
    );
    expect(json.artifacts.vocabCards).toHaveLength(1);
    expect(json.artifacts.readingPassage).toBeTruthy();
  });

  it("returns existing frozenAt without re-freezing if already frozen", async () => {
    const existingFrozenAt = new Date("2026-01-01T02:00:00Z");
    const mockLesson = {
      id: "lesson-2",
      frozenAt: existingFrozenAt,
      studyDay: 1,
      curriculum: { userId: "dev-user-id" },
    };

    (prisma.dailyLesson.findFirst as jest.Mock).mockResolvedValue(mockLesson);
    (prisma.aIArtifact.findMany as jest.Mock).mockResolvedValue([]);

    const req = makeRequest({ dailyLessonId: "lesson-2" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.dailyLesson.update).not.toHaveBeenCalled();
    expect(new Date(json.frozenAt).getTime()).toBe(existingFrozenAt.getTime());
  });
});
