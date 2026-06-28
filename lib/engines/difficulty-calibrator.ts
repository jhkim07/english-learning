/**
 * DifficultyCalibrator — converts Float level (1.0–5.0) into concrete generation parameters.
 *
 * V1 only specifies levels 1.0–2.0.
 * - level > 2.0: clamp to 2.0 with warning log
 * - level < 1.0: clamp to 1.0 (silent)
 *
 * Uses linear interpolation between defined breakpoints.
 * For numeric fields: interpolate linearly
 * For string fields: use nearest lower breakpoint value (no interpolation)
 */

export type VocabParams = {
  targetFrequencyMin: number;
  targetFrequencyMax: number;
  useAcademic: boolean;
  cefr: string;
};

export type ReadingParams = {
  wordCount: [number, number];
  textType: string;
  questionDepth: string;
};

export type ConvParams = {
  scenarioType: string;
  turnComplexity: string;
};

export type WritingParams = {
  wordCountTarget: [number, number];
  style: string;
};

/**
 * Vocabulary calibration table (breakpoints)
 * Main anchor points for interpolation: 1.0, 1.5, 2.0
 * Table also defines fine-grained values at 1.2, 1.8 for reference/validation
 */
interface VocabBreakpoint {
  level: number;
  targetFrequencyMin: number;
  targetFrequencyMax: number;
  useAcademic: boolean;
  cefr: string;
}

const VOCAB_BREAKPOINTS: VocabBreakpoint[] = [
  { level: 1.0, targetFrequencyMin: 1000, targetFrequencyMax: 3000, useAcademic: false, cefr: "B2" },
  { level: 1.5, targetFrequencyMin: 600, targetFrequencyMax: 2500, useAcademic: true, cefr: "C1" },
  { level: 2.0, targetFrequencyMin: 200, targetFrequencyMax: 1500, useAcademic: true, cefr: "C1+" },
];

/**
 * Reading calibration table (breakpoints)
 */
interface ReadingBreakpoint {
  level: number;
  wordCountMin: number;
  wordCountMax: number;
  textType: string;
  questionDepth: string;
}

const READING_BREAKPOINTS: ReadingBreakpoint[] = [
  { level: 1.0, wordCountMin: 380, wordCountMax: 420, textType: "narrative", questionDepth: "literal" },
  { level: 1.5, wordCountMin: 400, wordCountMax: 450, textType: "expository", questionDepth: "inferential" },
  { level: 2.0, wordCountMin: 430, wordCountMax: 480, textType: "argumentative", questionDepth: "analytical" },
];

/**
 * Conversation calibration table (breakpoints)
 */
interface ConvBreakpoint {
  level: number;
  scenarioType: string;
  turnComplexity: string;
}

const CONV_BREAKPOINTS: ConvBreakpoint[] = [
  { level: 1.0, scenarioType: "everyday", turnComplexity: "simple" },
  { level: 1.5, scenarioType: "professional", turnComplexity: "moderate" },
  { level: 2.0, scenarioType: "academic", turnComplexity: "complex" },
];

/**
 * Writing calibration table (breakpoints)
 */
interface WritingBreakpoint {
  level: number;
  wordCountMin: number;
  wordCountMax: number;
  style: string;
}

const WRITING_BREAKPOINTS: WritingBreakpoint[] = [
  { level: 1.0, wordCountMin: 160, wordCountMax: 200, style: "descriptive" },
  { level: 1.5, wordCountMin: 180, wordCountMax: 220, style: "analytical" },
  { level: 2.0, wordCountMin: 200, wordCountMax: 240, style: "argumentative" },
];

/**
 * Clamp level to [1.0, 2.0] range with optional warning for overage
 */
function clampLevel(level: number): number {
  if (level > 2.0) {
    console.warn(
      `[DifficultyCalibrator] level ${level} clamped to 2.0 — add entries to DifficultyCalibrator to extend above 2.0`
    );
    return 2.0;
  }
  if (level < 1.0) {
    return 1.0;
  }
  return level;
}

/**
 * Find the two breakpoints that bracket the given level for interpolation
 * Returns a single breakpoint if exact match, or [lower, upper] pair for interpolation
 */
function findBrackets<T extends { level: number }>(level: number, breakpoints: T[]): [T, T] | T {
  // Check for exact match
  for (const bp of breakpoints) {
    if (Math.abs(bp.level - level) < 1e-9) {
      return bp;
    }
  }

  if (level <= breakpoints[0].level) {
    return breakpoints[0];
  }
  if (level >= breakpoints[breakpoints.length - 1].level) {
    return breakpoints[breakpoints.length - 1];
  }

  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (level >= breakpoints[i].level && level <= breakpoints[i + 1].level) {
      return [breakpoints[i], breakpoints[i + 1]];
    }
  }

  return breakpoints[breakpoints.length - 1];
}

/**
 * Linear interpolation helper for numeric values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calibrate vocabulary parameters for a given level
 */
export function calibrateVocab(level: number): VocabParams {
  level = clampLevel(level);

  const brackets = findBrackets(level, VOCAB_BREAKPOINTS);
  if (!Array.isArray(brackets)) {
    // Exact match or clamped to boundary
    return {
      targetFrequencyMin: brackets.targetFrequencyMin,
      targetFrequencyMax: brackets.targetFrequencyMax,
      useAcademic: brackets.useAcademic,
      cefr: brackets.cefr,
    };
  }

  // Interpolate between two breakpoints
  const [lower, upper] = brackets;
  const t = (level - lower.level) / (upper.level - lower.level);

  return {
    targetFrequencyMin: Math.round(lerp(lower.targetFrequencyMin, upper.targetFrequencyMin, t)),
    targetFrequencyMax: Math.round(lerp(lower.targetFrequencyMax, upper.targetFrequencyMax, t)),
    // For string fields, use nearest lower breakpoint
    useAcademic: lower.useAcademic,
    cefr: lower.cefr,
  };
}

/**
 * Calibrate reading parameters for a given level
 */
export function calibrateReading(level: number): ReadingParams {
  level = clampLevel(level);

  const brackets = findBrackets(level, READING_BREAKPOINTS);
  if (!Array.isArray(brackets)) {
    return {
      wordCount: [brackets.wordCountMin, brackets.wordCountMax],
      textType: brackets.textType,
      questionDepth: brackets.questionDepth,
    };
  }

  // Interpolate between two breakpoints
  const [lower, upper] = brackets;
  const t = (level - lower.level) / (upper.level - lower.level);

  return {
    wordCount: [
      Math.round(lerp(lower.wordCountMin, upper.wordCountMin, t)),
      Math.round(lerp(lower.wordCountMax, upper.wordCountMax, t)),
    ],
    textType: lower.textType,
    questionDepth: lower.questionDepth,
  };
}

/**
 * Calibrate conversation parameters for a given level
 */
export function calibrateConversation(level: number): ConvParams {
  level = clampLevel(level);

  const brackets = findBrackets(level, CONV_BREAKPOINTS);
  if (!Array.isArray(brackets)) {
    return {
      scenarioType: brackets.scenarioType,
      turnComplexity: brackets.turnComplexity,
    };
  }

  // For string fields, use nearest lower breakpoint (no interpolation)
  const [lower] = brackets;
  return {
    scenarioType: lower.scenarioType,
    turnComplexity: lower.turnComplexity,
  };
}

/**
 * Calibrate writing parameters for a given level
 */
export function calibrateWriting(level: number): WritingParams {
  level = clampLevel(level);

  const brackets = findBrackets(level, WRITING_BREAKPOINTS);
  if (!Array.isArray(brackets)) {
    return {
      wordCountTarget: [brackets.wordCountMin, brackets.wordCountMax],
      style: brackets.style,
    };
  }

  // Interpolate between two breakpoints
  const [lower, upper] = brackets;
  const t = (level - lower.level) / (upper.level - lower.level);

  return {
    wordCountTarget: [
      Math.round(lerp(lower.wordCountMin, upper.wordCountMin, t)),
      Math.round(lerp(lower.wordCountMax, upper.wordCountMax, t)),
    ],
    style: lower.style,
  };
}
