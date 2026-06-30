import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { onNodeComplete } from "@/lib/engines/graph-engine"

export async function POST(
  req: Request,
  { params }: { params: { nodeId: string } }
) {
  // 1. 인증 확인
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. 요청 파싱 및 입력 유효성 검사
  const body = await req.json()
  const { score, failedItems } = body
  if (typeof score !== "number" || score < 0 || score > 1) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 })
  }
  if (!Array.isArray(failedItems)) {
    return NextResponse.json({ error: "Invalid failedItems" }, { status: 400 })
  }

  // 3. 노드 소유권 확인 (IDOR 방어)
  const node = await prisma.learningNode.findFirst({
    where: { id: params.nodeId, userId: session.user.id }
  })
  if (!node) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // 4. 이미 완료된 노드: 409 반환 (idempotent — 에러로 throw하지 않음)
  if (node.status === "COMPLETED") {
    return NextResponse.json({ error: "Already completed" }, { status: 409 })
  }

  // 5. 그래프 엔진 호출
  try {
    const result = await onNodeComplete(session.user.id, params.nodeId, score, failedItems)

    // 6. graphDelta 구성
    const created: Array<{ node?: typeof result.nextNode; edge?: object }> = [
      { node: result.nextNode }
    ]
    if (result.reviewNode) {
      created.unshift({ node: result.reviewNode })
    }

    return NextResponse.json({
      reviewNode: result.reviewNode,
      nextNode: result.nextNode,
      graphDelta: { created }
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Already completed") {
      return NextResponse.json({ error: "Already completed" }, { status: 409 })
    }
    console.error("[NodeComplete]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
