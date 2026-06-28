import {
  calibrateVocab,
  calibrateReading,
  calibrateConversation,
  calibrateWriting,
} from "@/lib/engines/difficulty-calibrator";

describe("DifficultyCalibrator", () => {
  describe("calibrateVocab", () => {
    it("returns correct params for level 1.0", () => {
      const result = calibrateVocab(1.0);
      expect(result.targetFrequencyMin).toBe(1000);
      expect(result.targetFrequencyMax).toBe(3000);
      expect(result.cefr).toBe("B2");
      expect(result.useAcademic).toBe(false);
    });

    it("returns correct params for level 1.5", () => {
      const result = calibrateVocab(1.5);
      expect(result.targetFrequencyMin).toBe(600);
      expect(result.targetFrequencyMax).toBe(2500);
      expect(result.cefr).toBe("C1");
      expect(result.useAcademic).toBe(true);
    });

    it("returns correct params for level 2.0", () => {
      const result = calibrateVocab(2.0);
      expect(result.targetFrequencyMin).toBe(200);
      expect(result.targetFrequencyMax).toBe(1500);
      expect(result.cefr).toBe("C1+");
      expect(result.useAcademic).toBe(true);
    });

    it("interpolates between 1.0 and 1.5 for level 1.25", () => {
      const result = calibrateVocab(1.25);
      // Min: 1000 - (1000 - 600) * 0.5 = 800
      // Max: 3000 - (3000 - 2500) * 0.5 = 2750
      expect(result.targetFrequencyMin).toBe(800);
      expect(result.targetFrequencyMax).toBe(2750);
      // String fields use nearest lower breakpoint: 1.0 -> B2
      expect(result.cefr).toBe("B2");
      expect(result.useAcademic).toBe(false);
    });

    it("clamps level > 2.0 to 2.0 and logs warning", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const result = calibrateVocab(2.1);
      expect(result.targetFrequencyMin).toBe(200);
      expect(result.targetFrequencyMax).toBe(1500);
      expect(result.cefr).toBe("C1+");
      expect(result.useAcademic).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain("2.1");
      warnSpy.mockRestore();
    });

    it("clamps level < 1.0 to 1.0 without warning", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const result = calibrateVocab(0.9);
      expect(result.targetFrequencyMin).toBe(1000);
      expect(result.targetFrequencyMax).toBe(3000);
      expect(result.cefr).toBe("B2");
      expect(result.useAcademic).toBe(false);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("calibrateReading", () => {
    it("returns correct params for level 1.0", () => {
      const result = calibrateReading(1.0);
      expect(result.wordCount).toEqual([380, 420]);
      expect(result.textType).toBe("narrative");
      expect(result.questionDepth).toBe("literal");
    });

    it("returns correct params for level 1.5", () => {
      const result = calibrateReading(1.5);
      expect(result.wordCount).toEqual([400, 450]);
      expect(result.textType).toBe("expository");
      expect(result.questionDepth).toBe("inferential");
    });

    it("returns correct params for level 2.0", () => {
      const result = calibrateReading(2.0);
      expect(result.wordCount).toEqual([430, 480]);
      expect(result.textType).toBe("argumentative");
      expect(result.questionDepth).toBe("analytical");
    });

    it("interpolates word count between 1.0 and 1.5 for level 1.25", () => {
      const result = calibrateReading(1.25);
      // Min: 380 + (400 - 380) * 0.5 = 390
      // Max: 420 + (450 - 420) * 0.5 = 435
      expect(result.wordCount).toEqual([390, 435]);
      expect(result.textType).toBe("narrative");
      expect(result.questionDepth).toBe("literal");
    });

    it("clamps level > 2.0 to 2.0", () => {
      const result = calibrateReading(2.5);
      expect(result.wordCount).toEqual([430, 480]);
      expect(result.textType).toBe("argumentative");
      expect(result.questionDepth).toBe("analytical");
    });

    it("clamps level < 1.0 to 1.0", () => {
      const result = calibrateReading(0.5);
      expect(result.wordCount).toEqual([380, 420]);
      expect(result.textType).toBe("narrative");
      expect(result.questionDepth).toBe("literal");
    });
  });

  describe("calibrateConversation", () => {
    it("returns correct params for level 1.0", () => {
      const result = calibrateConversation(1.0);
      expect(result.scenarioType).toBe("everyday");
      expect(result.turnComplexity).toBe("simple");
    });

    it("returns correct params for level 1.5", () => {
      const result = calibrateConversation(1.5);
      expect(result.scenarioType).toBe("professional");
      expect(result.turnComplexity).toBe("moderate");
    });

    it("returns correct params for level 2.0", () => {
      const result = calibrateConversation(2.0);
      expect(result.scenarioType).toBe("academic");
      expect(result.turnComplexity).toBe("complex");
    });

    it("uses nearest lower breakpoint for string fields at level 1.3", () => {
      const result = calibrateConversation(1.3);
      expect(result.scenarioType).toBe("everyday");
      expect(result.turnComplexity).toBe("simple");
    });

    it("clamps level > 2.0 to 2.0", () => {
      const result = calibrateConversation(3.0);
      expect(result.scenarioType).toBe("academic");
      expect(result.turnComplexity).toBe("complex");
    });

    it("clamps level < 1.0 to 1.0", () => {
      const result = calibrateConversation(0.5);
      expect(result.scenarioType).toBe("everyday");
      expect(result.turnComplexity).toBe("simple");
    });
  });

  describe("calibrateWriting", () => {
    it("returns correct params for level 1.0", () => {
      const result = calibrateWriting(1.0);
      expect(result.wordCountTarget).toEqual([160, 200]);
      expect(result.style).toBe("descriptive");
    });

    it("returns correct params for level 1.5", () => {
      const result = calibrateWriting(1.5);
      expect(result.wordCountTarget).toEqual([180, 220]);
      expect(result.style).toBe("analytical");
    });

    it("returns correct params for level 2.0", () => {
      const result = calibrateWriting(2.0);
      expect(result.wordCountTarget).toEqual([200, 240]);
      expect(result.style).toBe("argumentative");
    });

    it("interpolates word count between 1.0 and 1.5 for level 1.25", () => {
      const result = calibrateWriting(1.25);
      // Min: 160 + (180 - 160) * 0.5 = 170
      // Max: 200 + (220 - 200) * 0.5 = 210
      expect(result.wordCountTarget).toEqual([170, 210]);
      expect(result.style).toBe("descriptive");
    });

    it("clamps level > 2.0 to 2.0", () => {
      const result = calibrateWriting(2.5);
      expect(result.wordCountTarget).toEqual([200, 240]);
      expect(result.style).toBe("argumentative");
    });

    it("clamps level < 1.0 to 1.0", () => {
      const result = calibrateWriting(0.5);
      expect(result.wordCountTarget).toEqual([160, 200]);
      expect(result.style).toBe("descriptive");
    });
  });

  describe("console.warn for clamped levels", () => {
    it("warns exactly once when level > 2.0 and message includes actual level", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      calibrateVocab(2.5);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain("2.5");
      expect(warnSpy.mock.calls[0][0]).toContain("clamped to 2.0");
      warnSpy.mockRestore();
    });

    it("does not warn when level is in valid range", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      calibrateVocab(1.5);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("does not warn when level < 1.0", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      calibrateVocab(0.8);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
