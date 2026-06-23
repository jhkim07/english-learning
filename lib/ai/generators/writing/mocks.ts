import { registerMock } from "@/lib/ai/mock-registry";
import type { WritingPrompt } from "./types";

const MOCK_WRITING_PROMPT: WritingPrompt = {
  prompt: "Your company has recently adopted a hybrid work policy. Write an email to your team explaining the new policy, its benefits, and the expectations for both in-office and remote days.",
  context: "You are a team manager at a mid-sized technology company. Your HR department has just finalized a hybrid work policy: employees work from the office 3 days per week and remotely 2 days. Your team of 8 people has mixed feelings about this change.",
  targetGrammar: ["passive voice", "formal email structure", "conditional sentences"],
  minimumWords: 180,
  maximumWords: 220,
  sampleOutline: "1. Subject line + greeting / 2. Announcement and policy summary / 3. Benefits of hybrid model / 4. Schedule and expectations / 5. Closing and invitation for questions",
  difficulty: 3,
};

export function registerWritingMocks(): void {
  for (let level = 1; level <= 5; level++) {
    registerMock(`writing:${level}`, MOCK_WRITING_PROMPT);
  }
}
