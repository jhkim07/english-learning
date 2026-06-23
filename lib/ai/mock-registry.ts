export type MockFixture = unknown;

const registry = new Map<string, MockFixture>();

export function registerMock(key: string, fixture: MockFixture): void {
  registry.set(key, fixture);
}

export function getMock(key: string): MockFixture | undefined {
  return registry.get(key);
}

export function isMockMode(): boolean {
  return process.env.AI_MOCK_MODE === "true";
}
