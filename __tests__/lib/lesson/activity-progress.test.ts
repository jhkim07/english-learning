import { markActivityComplete, getCompletedActivities, ACTIVITY_KEYS } from "@/lib/lesson/activity-progress";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });
Object.defineProperty(global, "window", { value: global });

describe("activity-progress", () => {
  beforeEach(() => localStorageMock.clear());

  it("marks activity as complete and persists to localStorage", () => {
    markActivityComplete("lesson-1", "flashcards");
    const completed = getCompletedActivities("lesson-1");
    expect(completed).toContain("flashcards");
  });

  it("does not duplicate when marking same activity twice", () => {
    markActivityComplete("lesson-1", "reading");
    markActivityComplete("lesson-1", "reading");
    const completed = getCompletedActivities("lesson-1");
    expect(completed.filter((a) => a === "reading")).toHaveLength(1);
  });

  it("ACTIVITY_KEYS has exactly 5 activities", () => {
    expect(ACTIVITY_KEYS).toHaveLength(5);
  });
});
