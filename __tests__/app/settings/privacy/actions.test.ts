jest.mock("@/lib/auth/dev-bypass", () => ({
  DEV_BYPASS_AUTH: true,
  DEV_USER_ID: "dev-user-id",
}));

jest.mock("@/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/db", () => ({
  prisma: {
    userProfile: {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    // ConversationTurn and WritingSubmission don't exist yet in schema
    flashcardAttempt: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    errorRecord: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    weeklyAssessment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    monthlyExam: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    progressionDecision: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    aIArtifact: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    generationJob: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    monthlyCurriculum: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    user: { delete: jest.fn().mockResolvedValue({}) },
  },
}));

import { prisma } from "@/lib/db";
import {
  updateAudioConsent,
  deleteTranscripts,
  deleteAccount,
} from "@/app/(app)/settings/privacy/actions";

describe("privacy actions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updateAudioConsent updates UserProfile.audioConsent", async () => {
    await updateAudioConsent({ consent: true });
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "dev-user-id" },
      data: { audioConsent: true },
    });
  });

  it("deleteTranscripts resolves without error (V2 models not yet in schema)", async () => {
    // ConversationTurn and WritingSubmission are V2 models.
    // Action is a no-op until they are added to schema.
    await expect(deleteTranscripts()).resolves.toBeUndefined();
  });

  it("deleteAccount deletes user and all cascade data", async () => {
    await deleteAccount();
    expect(prisma.errorRecord.deleteMany).toHaveBeenCalled();
    expect(prisma.aIArtifact.deleteMany).toHaveBeenCalled();
    expect(prisma.monthlyCurriculum.deleteMany).toHaveBeenCalled();
    expect(prisma.userProfile.delete).toHaveBeenCalledWith({
      where: { userId: "dev-user-id" },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "dev-user-id" } });
  });
});
