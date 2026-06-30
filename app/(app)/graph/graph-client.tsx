"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import type { Node, Edge } from "@xyflow/react"
import GraphCanvas from "@/components/learning-graph/graph-canvas"

interface GraphClientProps {
  initialNodes: Node[]
  initialEdges: Edge[]
}

export default function GraphClient({ initialNodes, initialEdges }: GraphClientProps) {
  const router = useRouter()

  const handleNodeClick = useCallback((nodeId: string, status: string) => {
    if (status === "COMPLETED") {
      alert("완료된 학습입니다. (이전 결과 조회는 레슨 페이지에서 확인하세요)")
      return
    }
    if (status === "LOCKED") {
      alert("이전 복습을 먼저 완료해주세요.")
      return
    }
    router.push(`/lesson/${nodeId}`) // TODO: Task E에서 getOrCreateLesson 연결
  }, [router])

  return (
    <div style={{ width: "100%", height: "calc(100vh - 57px)" }}>
      <GraphCanvas
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
