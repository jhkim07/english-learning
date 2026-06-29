import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { adjustLevels } from "@/lib/engines/level-adjustment-engine"

export async function POST(
  _req: Request,
  { params }: { params: { lessonId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // IDOR protection: verify lesson belongs to current user (T4)
  const lesson = await prisma.dailyLesson.findFirst({
    where: { id: params.lessonId, userId: session.user.id },
  })
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const result = await adjustLevels(session.user.id, params.lessonId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    // P2002 = unique constraint violation (race condition: concurrent calls) (T-race)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Already processed" }, { status: 409 })
    }
    throw err
  }
}
