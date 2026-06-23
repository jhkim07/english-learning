import { buildFlashcards } from "@/components/flashcard/build-flashcards";

const MOCK_ARTIFACTS = [
  {
    artifactId: "vocab-1",
    artifactType: "VOCABULARY_CARD",
    content: {
      word: "paradigm",
      definition: "A typical example or pattern",
      exampleSentence: "This is a paradigm shift.",
      partOfSpeech: "noun",
      difficulty: 3,
      mnemonicNote: "Think of a pair of dimes",
    },
  },
  {
    artifactId: "sentence-1",
    artifactType: "SENTENCE_CARD",
    content: {
      sentence: "The new ___ has changed everything.",
      answer: "paradigm",
      hint: "Think of pattern",
      translation: "새로운 패러다임이 모든 것을 바꿨다.",
    },
  },
];

describe("buildFlashcards", () => {
  it("builds vocab and sentence cards from artifacts", () => {
    const cards = buildFlashcards(MOCK_ARTIFACTS);
    expect(cards).toHaveLength(2);
    expect(cards[0].type).toBe("vocab_front");
    expect(cards[0].front.title).toBe("paradigm");
    expect(cards[1].type).toBe("sentence_blank");
    expect(cards[1].front.title).toContain("___");
  });

  it("sets back content with definition and example", () => {
    const cards = buildFlashcards(MOCK_ARTIFACTS);
    expect(cards[0].back.title).toBe("A typical example or pattern");
    expect(cards[0].back.subtitle).toBe("This is a paradigm shift.");
  });

  it("returns empty array for empty artifacts", () => {
    const cards = buildFlashcards([]);
    expect(cards).toHaveLength(0);
  });
});
