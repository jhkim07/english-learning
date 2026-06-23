import { DAILY_VOLUME } from "@/lib/engines/constants";

// Test the review item count constant (no component rendering needed)
describe("Error review constants", () => {
  it("error review uses exactly 5 items from DAILY_VOLUME", () => {
    expect(DAILY_VOLUME.ERROR_REVIEW_ITEMS).toBe(5);
  });
});

// Test recordError input validation
import { recordError } from "@/lib/errors/record-error";

jest.mock("@/lib/db", () => ({
  prisma: {
    errorRecord: {
      create: jest.fn().mockResolvedValue({ id: "err-123" }),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("recordError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an ErrorRecord with correct fields", async () => {
    await recordError({
      userId: "user-1",
      domain: "conversation",
      errorType: "grammar",
      content: { original: "I am very exciting" },
      feedback: "Use 'excited' not 'exciting' for emotions",
    });

    expect(prisma.errorRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        domain: "conversation",
        errorType: "grammar",
        feedback: expect.stringContaining("excited"),
      }),
    });
  });

  it("accepts all three domains", async () => {
    const domains: ("conversation" | "reading" | "writing")[] = [
      "conversation",
      "reading",
      "writing",
    ];

    for (const domain of domains) {
      await recordError({
        userId: "user-1",
        domain,
        errorType: "test",
        content: {},
        feedback: "test feedback",
      });
    }

    expect(prisma.errorRecord.create).toHaveBeenCalledTimes(3);
  });
});
