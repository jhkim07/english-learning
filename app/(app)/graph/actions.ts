"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getOrCreateLesson } from "@/lib/engines/graph-engine"

export async function openNodeLesson(nodeId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const node = await prisma.learningNode.findFirst({
    where: { id: nodeId, userId: session.user.id },
  })
  if (!node) throw new Error("Node not found")
  if (node.status === "LOCKED") throw new Error("Node is locked")

  return getOrCreateLesson(session.user.id, nodeId)
}
