jest.mock("@/lib/db", () => ({
  prisma: {
    userProfile: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { saveDiagnosis } from "@/app/(app)/diagnosis/actions";
import { prisma } from "@/lib/db";

describe("saveDiagnosis", () => {
  it("creates a UserProfile and redirects to /calendar", async () => {
    await expect(
      saveDiagnosis({
        userId: "user-123",
        level: 3,
        goal: "비즈니스 영어",
        dailyTarget: 50,
        answers: { level: 3, goal: "비즈니스 영어", dailyTarget: 50 },
      })
    ).rejects.toThrow("REDIRECT:/calendar");

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
        create: expect.objectContaining({
          userId: "user-123",
          currentLevel: 3,
          studyGoal: "비즈니스 영어",
          dailyTargetMinutes: 50,
        }),
      })
    );
  });
});
