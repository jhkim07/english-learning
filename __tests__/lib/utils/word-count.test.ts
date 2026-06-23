import { countWords, isWordCountInRange } from "@/lib/utils/word-count";
import { DAILY_VOLUME } from "@/lib/engines/constants";

describe("countWords", () => {
  it("counts words correctly", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  leading   spaces  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("isWordCountInRange", () => {
  it("accepts text within writing range", () => {
    const text = Array(200).fill("word").join(" ");
    expect(isWordCountInRange(text, DAILY_VOLUME.WRITING_MIN_WORDS, DAILY_VOLUME.WRITING_MAX_WORDS)).toBe(true);
  });

  it("rejects text below minimum", () => {
    const text = Array(150).fill("word").join(" ");
    expect(isWordCountInRange(text, DAILY_VOLUME.WRITING_MIN_WORDS, DAILY_VOLUME.WRITING_MAX_WORDS)).toBe(false);
  });

  it("rejects text above maximum", () => {
    const text = Array(250).fill("word").join(" ");
    expect(isWordCountInRange(text, DAILY_VOLUME.WRITING_MIN_WORDS, DAILY_VOLUME.WRITING_MAX_WORDS)).toBe(false);
  });
});
