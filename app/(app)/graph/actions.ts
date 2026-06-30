"use server"
import { auth } from "@/auth"
import { getOrCreateLesson } from "@/lib/engines/graph-engine"

export async function openNodeLesson(nodeId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return getOrCreateLesson(session.user.id, nodeId)
}
