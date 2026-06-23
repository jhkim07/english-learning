import { readFileSync } from "fs";
import path from "path";

describe("PWA Manifest", () => {
  let manifest: Record<string, unknown>;

  beforeAll(() => {
    const raw = readFileSync(
      path.join(process.cwd(), "public/manifest.json"),
      "utf-8"
    );
    manifest = JSON.parse(raw);
  });

  it("has required manifest fields", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
  });

  it("has icon entries", () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  it("has theme_color set", () => {
    expect(manifest.theme_color).toBeTruthy();
  });
});
