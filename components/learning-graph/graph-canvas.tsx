"use client"

import { useCallback } from "react"
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, NodeMouseHandler } from "@xyflow/react"
import type { Node, Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import NodeCard from "./node-card"

const nodeTypes = { nodeCard: NodeCard }

interface GraphCanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onNodeClick: (nodeId: string, status: string) => void
}

export default function GraphCanvas({ initialNodes, initialEdges, onNodeClick }: GraphCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const status = (node.data as { status: string }).status
      const nodeId = (node.data as { nodeId: string }).nodeId
      onNodeClick(nodeId, status)
    },
    [onNodeClick]
  )

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
