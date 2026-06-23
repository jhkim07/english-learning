import { ProgressionEngine, PROGRESSION_THRESHOLDS } from "@/lib/progression/progression-engine";

jest.mock("@/lib/db", () => ({
  prisma: {
    progressionDecision: { create: jest.fn().mockResolvedValue({ id: "pd-1" }) },
    userProfile: { update: jest.fn().mockResolvedValue({}) },
    weeklyAssessment: { create: jest.fn().mockResolvedValue({}) },
    monthlyExam: { create: jest.fn().mockResolvedValue({}) },
  },
}));

import { prisma } from "@/lib/db";

describe("ProgressionEngine", () => {
  let engine: ProgressionEngine;
  beforeEach(() => {
    engine = new ProgressionEngine();
    jest.clearAllMocks();
  });

  it("promotes when score >= 75%", async () => {
    const result = await engine.evaluateProgression("user-1", 0.80, 3);
    expect(result.decision).toBe("promote");
    expect(result.nextLevel).toBe(4);
    expect(prisma.userProfile.update).toHaveBeenCalled();
  });

  it("stays when score is 60–74%", async () => {
    const result = await engine.evaluateProgression("user-1", 0.65, 3);
    expect(result.decision).toBe("stay");
    expect(result.nextLevel).toBeNull();
    expect(prisma.userProfile.update).not.toHaveBeenCalled();
  });

  it("recommends remediation when score < 60%", async () => {
    const result = await engine.evaluateProgression("user-1", 0.50, 3);
    expect(result.decision).toBe("remediation");
    expect(result.nextLevel).toBeNull();
  });

  it("caps promotion at level 5", async () => {
    const result = await engine.evaluateProgression("user-1", 0.90, 5);
    expect(result.decision).toBe("promote");
    expect(result.nextLevel).toBe(5); // already at max
  });

  it("saves weekly assessment correctly", async () => {
    await engine.saveWeeklyAssessment("user-1", 2, 15, 20);
    expect(prisma.weeklyAssessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ weekNumber: 2, correctItems: 15, totalItems: 20, score: 0.75 }),
      })
    );
  });
});
