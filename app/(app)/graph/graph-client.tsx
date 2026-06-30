"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { Node, Edge } from "@xyflow/react"
import GraphCanvas from "@/components/learning-graph/graph-canvas"
import { openNodeLesson } from "./actions"

interface GraphClientProps {
  initialNodes: Node[]
  initialEdges: Edge[]
}

export default function GraphClient({ initialNodes, initialEdges }: GraphClientProps) {
  const router = useRouter()
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null)

  const handleNodeClick = useCallback(async (nodeId: string, status: string) => {
    if (status === "COMPLETED") {
      alert("완료된 학습입니다. (이전 결과 조회는 레슨 페이지에서 확인하세요)")
      return
    }
    if (status === "LOCKED") {
      alert("이전 복습을 먼저 완료해주세요.")
      return
    }
    if (loadingNodeId) return
    setLoadingNodeId(nodeId)
    try {
      const lessonId = await openNodeLesson(nodeId)
      router.push(`/lesson/${lessonId}`)
    } catch (err) {
      console.error("Failed to open lesson:", err)
      alert("레슨을 열 수 없습니다. 다시 시도해주세요.")
      setLoadingNodeId(null)
    }
  }, [router, loadingNodeId])

  return (
    <div style={{ width: "100%", height: "calc(100vh - 57px)" }}>
      {loadingNodeId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="text-sm text-muted-foreground">레슨을 불러오는 중...</span>
        </div>
      )}
      <GraphCanvas
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
