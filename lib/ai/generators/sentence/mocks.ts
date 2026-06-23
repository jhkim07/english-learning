import { registerMock } from "@/lib/ai/mock-registry";
import type { SentenceCard } from "./types";

const MOCK_SENTENCE_CARDS: SentenceCard[] = [
  {
    sentence: "The new marketing strategy will ___ our brand awareness significantly.",
    answer: "boost",
    hint: "verb meaning to increase",
    explanation: "'Boost' means to increase or raise. Commonly used in business contexts.",
    difficulty: 3,
  },
  {
    sentence: "She managed to ___ the complex negotiations without any conflict.",
    answer: "navigate",
    hint: "verb meaning to manage or guide through",
    explanation: "'Navigate' means to steer through complexity. Figurative use of direction.",
    difficulty: 3,
  },
  {
    sentence: "The company decided to ___ its resources to the most profitable division.",
    answer: "allocate",
    hint: "verb meaning to distribute or assign",
    explanation: "'Allocate' means to distribute resources in a planned way.",
    difficulty: 4,
  },
  {
    sentence: "The CEO's decisive action helped to ___ the crisis before it escalated.",
    answer: "mitigate",
    hint: "verb meaning to make less severe",
    explanation: "'Mitigate' means to reduce the severity of something. Often used in risk management.",
    difficulty: 4,
  },
];

export function registerSentenceMocks(): void {
  for (let level = 1; level <= 5; level++) {
    registerMock(`sentence:4:${level}`, MOCK_SENTENCE_CARDS);
  }
}
