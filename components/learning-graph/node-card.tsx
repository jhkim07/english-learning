import { Handle, Position, NodeProps } from "@xyflow/react"

type NodeData = {
  type: string
  stage: number
  difficulty: number
  status: string
  score: number | null
  nodeId: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  VOCAB:        { label: "단어",  color: "bg-blue-500",   border: "border-blue-600" },
  CONVERSATION: { label: "회화",  color: "bg-purple-500", border: "border-purple-600" },
  READING:      { label: "읽기",  color: "bg-green-500",  border: "border-green-600" },
  WRITING:      { label: "쓰기",  color: "bg-orange-500", border: "border-orange-600" },
  REVIEW:       { label: "복습",  color: "bg-yellow-400", border: "border-yellow-500" },
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "LOCKED":      return "🔒"
    case "UNLOCKED":    return ""
    case "IN_PROGRESS": return "●"
    case "COMPLETED":   return "✓"
    default:            return ""
  }
}

export default function NodeCard({ data }: NodeProps) {
  const nodeData = data as NodeData
  const { type, stage, difficulty, status, score } = nodeData
  const config = TYPE_CONFIG[type] ?? { label: type, color: "bg-gray-400", border: "border-gray-500" }
  const statusIcon = getStatusIcon(status)

  const isLocked = status === "LOCKED"
  const borderClass = isLocked
    ? "border-gray-300 bg-gray-50"
    : `${config.border} bg-white`
  const pulseClass = status === "UNLOCKED" ? "animate-pulse" : ""

  return (
    <div className={`rounded-lg border-2 p-3 w-36 text-center shadow-sm cursor-pointer ${borderClass} ${pulseClass}`}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />

      <div className="text-xs text-gray-500 mb-1">
        {stage > 1 ? `${stage}단계` : ""}
      </div>
      <div className={`text-white text-sm font-bold rounded px-2 py-1 mb-2 ${isLocked ? "bg-gray-400" : config.color}`}>
        {config.label}
      </div>
      <div className="text-xs text-gray-600">Lv {difficulty.toFixed(1)}</div>
      <div className="text-sm mt-1">{statusIcon}</div>
      {status === "COMPLETED" && score !== null && (
        <div className="text-xs text-gray-500 mt-1">{Math.round(score * 100)}점</div>
      )}
    </div>
  )
}
