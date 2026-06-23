import OpenAI from "openai";
import crypto from "crypto";
import { uploadImageToR2, getSignedImageUrl } from "@/lib/storage/r2";
import { isMockMode } from "@/lib/ai/mock-registry";
import type { ImageGenerationInput, ImageResult } from "./types";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export class ImageGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(input: ImageGenerationInput): Promise<ImageResult> {
    if (isMockMode()) {
      return this.mockResult(input);
    }

    // Tier 1: Unsplash
    try {
      if (UNSPLASH_ACCESS_KEY) {
        const result = await this.fetchFromUnsplash(input);
        if (result) return result;
      }
    } catch {
      // Fall through to DALL-E
    }

    // Tier 2: DALL-E 3
    try {
      return await this.generateWithDallE(input);
    } catch {
      // Fall through to text fallback
    }

    // Tier 3: Text fallback
    return this.textFallback(input);
  }

  private async fetchFromUnsplash(input: ImageGenerationInput): Promise<ImageResult | null> {
    const query = encodeURIComponent(input.imagePrompt.split(" ").slice(0, 5).join(" "));
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      urls: { regular: string };
      alt_description: string | null;
      width: number;
      height: number;
    };

    // Download the image
    const imageResponse = await fetch(data.urls.regular);
    if (!imageResponse.ok) return null;

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const storagePath = this.buildStoragePath(input);

    await uploadImageToR2(buffer, storagePath, "image/jpeg");
    const url = await getSignedImageUrl(storagePath);

    return {
      url,
      altText: data.alt_description ?? `Mnemonic image for the word "${input.word}"`,
      source: "unsplash",
      width: data.width,
      height: data.height,
      storagePath,
      generatedAt: new Date(),
    };
  }

  private async generateWithDallE(input: ImageGenerationInput): Promise<ImageResult> {
    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: `Educational mnemonic illustration for the English word "${input.word}". ${input.imagePrompt}. Clean, minimalist style suitable for language learning.`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error("DALL-E 3 returned no image URL");

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error("Failed to download DALL-E 3 image");

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const storagePath = this.buildStoragePath(input);

    await uploadImageToR2(buffer, storagePath, "image/png");
    const url = await getSignedImageUrl(storagePath);

    return {
      url,
      altText: `Mnemonic image for the word "${input.word}": ${input.imagePrompt}`,
      source: "dalle3",
      width: 1024,
      height: 1024,
      storagePath,
      generatedAt: new Date(),
    };
  }

  private textFallback(input: ImageGenerationInput): ImageResult {
    return {
      url: "",
      altText: `Mnemonic for "${input.word}": ${input.imagePrompt}`,
      source: "text_fallback",
      width: 0,
      height: 0,
      storagePath: "",
      generatedAt: new Date(),
    };
  }

  private buildStoragePath(input: ImageGenerationInput): string {
    const hash = crypto.createHash("md5").update(input.imagePrompt).digest("hex").slice(0, 8);
    return `vocab/${input.userId}/${input.studyDay}/${input.word}-${hash}.jpg`;
  }

  private mockResult(input: ImageGenerationInput): ImageResult {
    return {
      url: `https://mock-r2.example.com/vocab/${input.userId}/${input.word}.jpg`,
      altText: `Mock mnemonic image for the word "${input.word}"`,
      source: "unsplash",
      width: 400,
      height: 400,
      storagePath: this.buildStoragePath(input),
      generatedAt: new Date(),
    };
  }
}
