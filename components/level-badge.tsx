import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function LevelBadge() {
  const session = await auth()
  if (!session?.user?.id) return null

  const profile = await prisma.levelProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) return null

  const fmt = (n: number) => n.toFixed(1)

  return (
    <div className="text-sm text-muted-foreground flex gap-2 flex-wrap">
      <span>단어 {fmt(profile.vocabulary)}</span>
      <span>·</span>
      <span>읽기 {fmt(profile.reading)}</span>
      <span>·</span>
      <span>회화 {fmt(profile.conversation)}</span>
      <span>·</span>
      <span>작문 {fmt(profile.writing)}</span>
    </div>
  )
}
