"use client";

import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import type { SwipeDirection } from "./types";

interface Props {
  onSwipe: (direction: SwipeDirection) => void;
  disabled?: boolean;
}

export function SwipeButtons({ onSwipe, disabled }: Props) {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        variant="outline"
        size="lg"
        className="w-28 h-14 border-red-300 text-red-500 hover:bg-red-50"
        onClick={() => onSwipe("left")}
        disabled={disabled}
        aria-label="Incorrect"
      >
        <X className="w-5 h-5 mr-1" />
        Incorrect
      </Button>
      <Button
        size="lg"
        className="w-28 h-14 bg-green-500 hover:bg-green-600"
        onClick={() => onSwipe("right")}
        disabled={disabled}
        aria-label="Correct"
      >
        <Check className="w-5 h-5 mr-1" />
        Correct
      </Button>
    </div>
  );
}
