import type { FlashcardData } from "./types";

interface ArtifactRecord {
  artifactId: string;
  artifactType: string;
  content: Record<string, unknown>;
  vocabArtifactId?: string | null;
}

export function buildFlashcards(artifacts: ArtifactRecord[]): FlashcardData[] {
  const cards: FlashcardData[] = [];

  const vocabArtifacts = artifacts.filter((a) => a.artifactType === "VOCABULARY_CARD");
  const sentenceArtifacts = artifacts.filter((a) => a.artifactType === "SENTENCE_CARD");
  const mnemonicImages = artifacts.filter((a) => a.artifactType === "MNEMONIC_IMAGE");

  // Build vocab cards (front/back pairs treated as one card with flip)
  for (const artifact of vocabArtifacts) {
    const vocab = artifact.content;
    const mnemonicImage = mnemonicImages.find(
      (img) => img.vocabArtifactId === artifact.artifactId
    );
    const imageUrl =
      (mnemonicImage?.content?.imageUrl as string | undefined) ??
      (mnemonicImage?.content?.storagePath as string | undefined) ??
      undefined;
    cards.push({
      id: artifact.artifactId,
      type: "vocab_front",
      front: {
        title: String(vocab.word ?? ""),
        subtitle: String(vocab.partOfSpeech ?? ""),
        imageUrl,
        badge: "New Word",
      },
      back: {
        title: String(vocab.definition ?? ""),
        subtitle: String(vocab.exampleSentence ?? ""),
        detail: vocab.mnemonicNote ? String(vocab.mnemonicNote) : undefined,
        badge: String(vocab.difficulty ?? ""),
      },
    });
  }

  // Build sentence cards
  for (const artifact of sentenceArtifacts) {
    const sentence = artifact.content;
    cards.push({
      id: artifact.artifactId,
      type: "sentence_blank",
      front: {
        title: String(sentence.sentence ?? ""),
        subtitle: sentence.hint ? String(sentence.hint) : undefined,
        badge: "Fill in the Blank",
      },
      back: {
        title: String(sentence.answer ?? ""),
        subtitle: sentence.translation ? String(sentence.translation) : undefined,
        badge: "Answer",
      },
    });
  }

  return cards;
}
