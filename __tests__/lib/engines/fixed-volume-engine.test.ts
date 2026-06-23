import { FixedVolumeControlEngine } from "@/lib/engines/fixed-volume-engine";
import { DAILY_VOLUME } from "@/lib/engines/constants";

describe("FixedVolumeControlEngine", () => {
  let engine: FixedVolumeControlEngine;

  beforeEach(() => {
    engine = new FixedVolumeControlEngine();
  });

  describe("validateWritingWordCount", () => {
    it("rejects writing under minimum words", () => {
      const result = engine.validateWritingWordCount(150);
      expect(result.valid).toBe(false);
      expect(result.issue).toContain(String(DAILY_VOLUME.WRITING_MIN_WORDS));
    });

    it("rejects writing over maximum words", () => {
      const result = engine.validateWritingWordCount(250);
      expect(result.valid).toBe(false);
      expect(result.issue).toContain(String(DAILY_VOLUME.WRITING_MAX_WORDS));
    });

    it("accepts writing within word count range", () => {
      const result = engine.validateWritingWordCount(200);
      expect(result.valid).toBe(true);
      expect(result.issue).toBeUndefined();
    });
  });

  describe("validateConversationTurns", () => {
    it("rejects conversation with fewer than minimum turns", () => {
      const result = engine.validateConversationTurns(5);
      expect(result.valid).toBe(false);
      expect(result.issue).toContain(String(DAILY_VOLUME.CONVERSATION_MIN_TURNS));
    });

    it("accepts conversation meeting minimum turns", () => {
      const result = engine.validateConversationTurns(8);
      expect(result.valid).toBe(true);
    });

    it("accepts conversation exceeding minimum turns", () => {
      const result = engine.validateConversationTurns(12);
      expect(result.valid).toBe(true);
    });
  });
});
