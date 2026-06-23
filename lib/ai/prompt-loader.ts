import fs from "fs";
import path from "path";
import type { PromptTemplate } from "./types";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

export class PromptLoader {
  private static cache = new Map<string, PromptTemplate>();

  static load(domain: string, name: string): PromptTemplate {
    const key = `${domain}/${name}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const filePath = path.join(PROMPTS_DIR, domain, `${name}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const template = JSON.parse(raw) as PromptTemplate;

    this.cache.set(key, template);
    return template;
  }

  static interpolate(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(
      /\{(\w+)\}/g,
      (_, key) => variables[key] ?? `{${key}}`
    );
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
