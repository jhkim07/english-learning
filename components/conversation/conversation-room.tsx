"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { sendConversationTurn } from "@/app/(app)/lesson/[lessonId]/conversation/actions";
import type { SpeakingScenario } from "@/lib/ai/generators/speaking";
import type { ConversationTurn } from "./types";

const MIN_TURNS = 8;
const MAX_TURNS = 20;

interface Props {
  lessonId: string;
  scenario: SpeakingScenario;
}

export function ConversationRoom({ lessonId, scenario }: Props) {
  const [turns, setTurns] = useState<ConversationTurn[]>([
    {
      id: "opening",
      role: "assistant",
      content: scenario.openingMessage,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userTurnCount, setUserTurnCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const isComplete = userTurnCount >= MIN_TURNS;
  const isMaxed = turns.length >= MAX_TURNS;

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading || isMaxed) return;

    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setTurns((prev) => [...prev, userTurn]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await sendConversationTurn({
        lessonId,
        userMessage: text,
        scenarioContext: scenario.goal,
        turnHistory: turns.map((t) => ({ role: t.role, content: t.content })),
        turnNumber: userTurnCount + 1,
      });

      const aiTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.aiReply,
        timestamp: new Date(),
      };

      setTurns((prev) => [
        ...prev.slice(0, -1), // replace last user turn with evaluated version
        { ...userTurn, evaluationScore: response.evaluationScore },
        aiTurn,
      ]);
      setUserTurnCount((prev) => prev + 1);
    } catch {
      setTurns((prev) => prev.slice(0, -1)); // remove failed user turn
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Scenario Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{scenario.category.replace("_", " ")}</Badge>
          <span className="text-xs text-muted-foreground">
            {userTurnCount}/{MIN_TURNS} turns
          </span>
        </div>
        <p className="text-sm font-medium">{scenario.title}</p>
        <p className="text-xs text-muted-foreground">
          You: {scenario.learnerRole} | AI: {scenario.aiRole}
        </p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                turn.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p>{turn.content}</p>
              {turn.evaluationScore !== undefined && (
                <p className="text-xs opacity-70 mt-1">
                  Score: {turn.evaluationScore}/10
                </p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">AI is responding…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        {isComplete ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              {isMaxed ? "Maximum turns reached." : "You've completed the minimum 8 turns!"}
            </p>
            <Button className="w-full" asChild>
              <a href={`/lesson/${lessonId}`}>Complete Conversation</a>
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || isMaxed}
            />
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading || isMaxed}
            >
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
