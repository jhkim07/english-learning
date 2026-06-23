import { registerMock, getMock, isMockMode } from "@/lib/ai/mock-registry";

describe("MockRegistry", () => {
  it("returns undefined for unregistered key", () => {
    expect(getMock("nonexistent-key")).toBeUndefined();
  });

  it("stores and retrieves a fixture", () => {
    const fixture = { word: "test", definition: "a test" };
    registerMock("test-key", fixture);
    expect(getMock("test-key")).toEqual(fixture);
  });

  it("isMockMode returns false by default", () => {
    const original = process.env.AI_MOCK_MODE;
    delete process.env.AI_MOCK_MODE;
    expect(isMockMode()).toBe(false);
    process.env.AI_MOCK_MODE = original;
  });

  it("isMockMode returns true when AI_MOCK_MODE=true", () => {
    process.env.AI_MOCK_MODE = "true";
    expect(isMockMode()).toBe(true);
    delete process.env.AI_MOCK_MODE;
  });
});
