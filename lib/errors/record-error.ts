import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface ErrorRecordInput {
  userId: string;
  domain: "conversation" | "reading" | "writing";
  errorType: string;
  content: Record<string, unknown>;
  feedback: string;
}

export async function recordError(input: ErrorRecordInput): Promise<void> {
  await prisma.errorRecord.create({
    data: {
      userId: input.userId,
      domain: input.domain,
      errorType: input.errorType,
      content: input.content as Prisma.InputJsonValue,
      feedback: input.feedback,
    },
  });
}
