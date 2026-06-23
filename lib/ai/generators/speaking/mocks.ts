import { registerMock } from "@/lib/ai/mock-registry";
import type { SpeakingScenario } from "./types";

const MOCK_SPEAKING_SCENARIO: SpeakingScenario = {
  category: "job_interview",
  title: "Tech Startup Interview",
  learnerRole: "a software engineer applying for a senior position at a growing startup",
  aiRole: "a technical hiring manager evaluating the candidate",
  goal: "Impress the interviewer with your technical knowledge and leadership experience, and negotiate a competitive salary.",
  wildcard: "Halfway through the interview, the manager mentions the role requires 30% international travel — something not in the job posting.",
  openingMessage: "Thanks for coming in today. I've reviewed your resume and I'm impressed by your background. Let's start with a brief introduction — can you tell me about your most challenging technical project and what you learned from it?",
  minimumTurns: 8,
};

export function registerSpeakingMocks(): void {
  for (let level = 1; level <= 5; level++) {
    registerMock(`speaking:${level}`, MOCK_SPEAKING_SCENARIO);
  }
}
