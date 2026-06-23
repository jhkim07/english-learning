import { registerMock } from "@/lib/ai/mock-registry";
import type { VocabularyCard } from "./types";

const MOCK_VOCAB_CARDS: VocabularyCard[] = [
  {
    word: "paradigm",
    definition: "A typical example or pattern; a model.",
    exampleSentence:
      "The new software represents a paradigm shift in how we work.",
    collocations: ["paradigm shift", "new paradigm", "dominant paradigm"],
    mnemonic: "Para (beside) + dig + ram: dig beside a RAM chip as your model",
    imagePrompt:
      "A glowing computer architecture diagram representing a new model",
  },
  {
    word: "leverage",
    definition: "Use something to maximum advantage.",
    exampleSentence:
      "We can leverage our customer base to grow the new product.",
    collocations: ["leverage data", "leverage expertise", "financial leverage"],
    mnemonic:
      "A lever in the age of tech: lift heavy tasks with the right tool",
    imagePrompt:
      "A lever lifting a heavy boulder representing power and advantage",
  },
  {
    word: "synergy",
    definition: "Combined effect greater than the sum of individual parts.",
    exampleSentence: "The merger created synergy between the two companies.",
    collocations: ["create synergy", "synergy effect", "team synergy"],
    mnemonic: "Syn (together) + energy: combined energy from working together",
    imagePrompt:
      "Two interlocking gears each powering the other, glowing with energy",
  },
  {
    word: "iterate",
    definition: "Perform repeatedly; to work through a process step by step.",
    exampleSentence:
      "We need to iterate on the design based on user feedback.",
    collocations: ["iterate over", "iterate quickly", "iterate on feedback"],
    mnemonic:
      "It + erate: it goes on and on, each step building on the last",
    imagePrompt:
      "A spiral staircase going up, each loop building on the previous",
  },
  {
    word: "scalable",
    definition: "Able to be scaled; capable of being expanded or adapted.",
    exampleSentence:
      "We need a scalable solution that can grow with the business.",
    collocations: [
      "scalable solution",
      "scalable architecture",
      "highly scalable",
    ],
    mnemonic: "Scale + able: able to climb the scale without breaking",
    imagePrompt:
      "A growing bar chart with an upward trajectory, clean and minimal",
  },
  {
    word: "robust",
    definition:
      "Strong and healthy; vigorous; able to withstand difficult conditions.",
    exampleSentence:
      "We need a robust system that can handle unexpected failures.",
    collocations: ["robust solution", "robust design", "robust performance"],
    mnemonic:
      "Rob + ust: a robust guard who cannot be robbed of his strength",
    imagePrompt:
      "A thick oak tree standing firm in a storm, roots deep and visible",
  },
  {
    word: "streamline",
    definition:
      "Make more efficient by removing unnecessary steps or processes.",
    exampleSentence:
      "We streamlined the approval process to save two days per cycle.",
    collocations: [
      "streamline operations",
      "streamline workflow",
      "streamline processes",
    ],
    mnemonic:
      "A stream (flow) + line (straight): cutting a straight line through the flow",
    imagePrompt:
      "A river flowing in a perfectly straight channel, efficient and fast",
  },
  {
    word: "benchmark",
    definition:
      "A standard or reference point against which things can be compared.",
    exampleSentence:
      "We use competitor pricing as a benchmark for our own rates.",
    collocations: ["set a benchmark", "benchmark test", "industry benchmark"],
    mnemonic: "Bench + mark: the mark you make on the bench before cutting",
    imagePrompt: "A ruler with precision markings on a clean white surface",
  },
  {
    word: "proactive",
    definition:
      "Creating or controlling a situation rather than just responding to it.",
    exampleSentence:
      "A proactive approach to risk management prevents costly surprises.",
    collocations: ["proactive approach", "proactive measures", "be proactive"],
    mnemonic: "Pro (before) + active: acting before the problem arrives",
    imagePrompt:
      "A person placing an umbrella up before rain clouds arrive",
  },
  {
    word: "cohesive",
    definition:
      "United; forming a whole; relating to the force of cohesion.",
    exampleSentence:
      "The team's cohesive communication style impressed the client.",
    collocations: [
      "cohesive team",
      "cohesive strategy",
      "cohesive narrative",
    ],
    mnemonic:
      "Co (together) + hesive: hesi-tate together, sticking to one plan",
    imagePrompt:
      "Five puzzle pieces fitting perfectly together, forming a complete picture",
  },
  {
    word: "pivot",
    definition:
      "Turn on a point; to change direction or strategy significantly.",
    exampleSentence:
      "After poor sales, the startup had to pivot to a new market.",
    collocations: ["strategic pivot", "pivot to", "pivot point"],
    mnemonic:
      "Pivot like a basketball player: one foot planted, the other swings",
    imagePrompt:
      "A basketball player pivoting on one foot, changing direction",
  },
  {
    word: "momentum",
    definition:
      "Strength or force gained by motion or by a series of events.",
    exampleSentence:
      "The project gained momentum after the first successful launch.",
    collocations: ["build momentum", "gain momentum", "maintain momentum"],
    mnemonic:
      "Moment + um: the 'ummm' after a moment when energy is building",
    imagePrompt:
      "A snowball rolling downhill, growing larger with each rotation",
  },
];

export function registerVocabularyMocks(): void {
  // Register for different count/level combinations used in tests
  for (let level = 1; level <= 5; level++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerMock(`vocabulary:12:${level}`, MOCK_VOCAB_CARDS as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerMock(`vocabulary:3:${level}`, MOCK_VOCAB_CARDS.slice(0, 3) as any);
  }
}
