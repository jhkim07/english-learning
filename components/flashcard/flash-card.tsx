"use client";

import { Badge } from "@/components/ui/badge";
import type { FlashcardData } from "./types";

interface Props {
  card: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashCard({ card, isFlipped, onFlip }: Props) {
  return (
    <div
      className="relative w-full h-64 cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={onFlip}
      role="button"
      aria-label={isFlipped ? "Card is flipped. Click to flip back." : "Click to reveal answer"}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl border bg-card p-6 flex flex-col justify-center items-center gap-2"
          style={{ backfaceVisibility: "hidden" }}
        >
          {card.front.badge && (
            <Badge variant="secondary" className="mb-2">
              {card.front.badge}
            </Badge>
          )}
          {card.front.imageUrl ? (
            <img
              src={card.front.imageUrl}
              alt={card.front.title ?? "Mnemonic image"}
              loading="lazy"
              className="max-h-32 object-contain rounded-lg"
            />
          ) : (
            <p className="text-3xl font-bold text-center">{card.front.title}</p>
          )}
          {card.front.subtitle && (
            <p className="text-sm text-muted-foreground text-center">{card.front.subtitle}</p>
          )}
          <p className="text-xs text-muted-foreground mt-4">tap to reveal</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border bg-primary/5 p-6 flex flex-col justify-center items-center gap-2"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {card.back.badge && (
            <Badge className="mb-2">{card.back.badge}</Badge>
          )}
          <p className="text-2xl font-semibold text-center">{card.back.title}</p>
          {card.back.subtitle && (
            <p className="text-sm text-muted-foreground text-center">{card.back.subtitle}</p>
          )}
          {card.back.detail && (
            <p className="text-xs text-center mt-2 text-muted-foreground border-t pt-2 w-full">
              {card.back.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
