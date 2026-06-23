import { PromptLoader } from "@/lib/ai/prompt-loader";
import fs from "fs";
import path from "path";

// Use the real prompts directory
describe("PromptLoader", () => {
  beforeEach(() => {
    PromptLoader.clearCache();
  });

  it("loads a real prompt file from prompts/ directory", () => {
    const template = PromptLoader.load("vocabulary", "generate");
    expect(template.version).toBeDefined();
    expect(template.systemPrompt).toBeTruthy();
    expect(template.userPromptTemplate).toBeTruthy();
  });

  it("caches the template on second load (same object reference)", () => {
    const first = PromptLoader.load("vocabulary", "generate");
    const second = PromptLoader.load("vocabulary", "generate");
    expect(first).toBe(second); // strict reference equality (cached)
  });

  it("throws when prompt file does not exist", () => {
    expect(() => PromptLoader.load("nonexistent", "domain")).toThrow(
      "Prompt not found"
    );
  });

  it("interpolates template variables", () => {
    const result = PromptLoader.interpolate("Hello {name}, level {level}", {
      name: "World",
      level: "3",
    });
    expect(result).toBe("Hello World, level 3");
  });

  it("leaves unresolved variables as-is", () => {
    const result = PromptLoader.interpolate("Hello {name}, level {level}", {
      name: "World",
    });
    expect(result).toBe("Hello World, level {level}");
  });
});
