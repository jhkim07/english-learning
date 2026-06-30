import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { initializeUserGraph } from "@/lib/engines/graph-engine"
import GraphClient from "./graph-client"

export default async function GraphPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  // 노드가 없으면 초기화
  const nodeCount = await prisma.learningNode.count({ where: { userId } })
  if (nodeCount === 0) {
    await initializeUserGraph(userId)
  }

  // 노드 + 엣지 로드
  const [nodes, edges] = await Promise.all([
    prisma.learningNode.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { stage: "asc" }] }),
    prisma.learningEdge.findMany({ where: { userId } }),
  ])

  // React Flow 형태로 변환
  const rfNodes = nodes.map((node) => ({
    id: node.id,
    type: "nodeCard",
    position: getNodePosition(node.type, node.stage),
    data: {
      type: node.type,
      stage: node.stage,
      difficulty: node.difficulty,
      status: node.status,
      score: node.score,
      nodeId: node.id,
    },
  }))

  const rfEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    animated: false,
  }))

  return <GraphClient initialNodes={rfNodes} initialEdges={rfEdges} />
}

function getNodePosition(type: string, stage: number): { x: number; y: number } {
  const yMap: Record<string, number> = {
    VOCAB: 0, CONVERSATION: 150, READING: 300, WRITING: 450, REVIEW: 600,
  }
  return { x: (stage - 1) * 220, y: yMap[type] ?? 0 }
}
