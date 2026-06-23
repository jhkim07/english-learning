export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  evaluationScore?: number;
  timestamp: Date;
}
