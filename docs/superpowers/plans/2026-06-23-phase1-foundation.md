# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js 14 project with auth, DB schema, local dev tooling, and three screens (login, level diagnostic, 20-day calendar) so that `npm run dev` → login → calendar is fully functional.

**Architecture:** Next.js 14 App Router with server components for data fetching; NextAuth v5 (auth.js) with Google OAuth and a Prisma adapter; PostgreSQL via Docker Compose locally, Railway in production. Protected routes enforced by a single middleware. Three screens are implemented as async server components — no client state yet.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, NextAuth v5 (auth.js), Prisma ORM, PostgreSQL + pgvector (via Docker), Vitest + React Testing Library (unit/component), Playwright (E2E).

## Global Constraints

- All new vocabulary card counts per SPEC.md §2: 20 new vocabulary cards/day (plan says 12 in CLAUDE.md; SPEC.md says 20 — implement 20).
- Dual-theme design system (Decision D8=A): flashcard screens = white/bright, learning screens = `bg-gray-950` dark focus mode.
- Mobile-first: 375px minimum viewport, all touch targets ≥ 44px height.
- Korean UI strings throughout (SPEC.md §15 screen names are Korean).
- No AI calls in Phase 1 — seed data uses mock artifacts with `imageSource: 'text'`.
- Prisma `AIArtifact` table uses `aIArtifact` by default — override to `ai_artifact` via `@@map`.
- NextAuth v5 uses `auth.js` docs, NOT nextauth.com v4 docs. Config export is `{ handlers, auth, signIn, signOut }`.
- pgvector extension must be enabled via Docker image `ankane/pgvector` and Prisma `previewFeatures = ["postgresqlExtensions"]`.
- MediaRecorder, STT, TTS — NOT implemented in Phase 1.

---

## File Structure

```
english-learning/
├── docker-compose.yml
├── .env.example
├── .env.local                         (gitignored — copy from .env.example)
├── README.md
├── DESIGN.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── components.json                    (shadcn/ui)
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   └── generate-today.ts              (placeholder — implemented in Phase 3)
├── e2e/
│   └── smoke.test.ts
└── src/
    ├── auth.ts                        (NextAuth v5 config)
    ├── middleware.ts                  (route protection)
    ├── lib/
    │   └── prisma.ts                  (Prisma client singleton)
    ├── components/
    │   ├── providers.tsx              (SessionProvider wrapper)
    │   ├── calendar/
    │   │   └── MonthCalendar.tsx
    │   └── diagnostic/
    │       └── DiagnosticForm.tsx
    ├── app/
    │   ├── layout.tsx                 (root layout — Inter font, SessionProvider)
    │   ├── page.tsx                   (/ → redirect to /calendar or /login)
    │   ├── api/
    │   │   ├── auth/
    │   │   │   └── [...nextauth]/
    │   │   │       └── route.ts
    │   │   └── diagnostic/
    │   │       └── route.ts           (POST /api/diagnostic — saves score)
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx
    │   └── (app)/
    │       ├── layout.tsx             (auth-protected wrapper)
    │       ├── calendar/
    │       │   └── page.tsx
    │       ├── diagnostic/
    │       │   └── page.tsx
    │       └── today/
    │           └── page.tsx           (placeholder — implemented in Phase 4)
    └── __tests__/
        ├── setup.ts
        ├── calendar.test.tsx
        └── diagnostic.test.tsx
```

---

### Task 1: Project scaffolding + testing tooling

**Files:**
- Create: `package.json` (via `npm create next-app@latest`)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/__tests__/setup.ts`

**Interfaces:**
- Produces: `npm run dev` starts on :3000; `npm test` runs Vitest; `npm run test:e2e` runs Playwright.

- [ ] **Step 1: Bootstrap Next.js project**

```bash
cd /home/jin/prj_ws/english-learning
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

When prompted: accept defaults. Overwrite existing files if prompted (CLAUDE.md, SPEC.md, PLAN.md are outside `src/` and won't be touched).

- [ ] **Step 2: Install core dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter @prisma/client @aws-sdk/client-s3
npm install --save-dev prisma @types/node vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @playwright/test
npx playwright install chromium --with-deps
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install required components:

```bash
npx shadcn@latest add button card badge progress separator input label textarea dialog
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Create `src/__tests__/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

- [ ] **Step 7: Add scripts to `package.json`**

Add to the `"scripts"` section:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:e2e": "playwright test",
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"generate:today": "tsx scripts/generate-today.ts"
```

Install `tsx` for running TypeScript scripts:

```bash
npm install --save-dev tsx
```

- [ ] **Step 8: Verify project boots**

```bash
npm run dev
```

Expected: "Ready - started server on 0.0.0.0:3000" with no errors. Open http://localhost:3000.

- [ ] **Step 9: Verify test runner works**

```bash
npm test -- --run
```

Expected: PASS (no test files yet — Vitest exits cleanly).

- [ ] **Step 10: Commit**

```bash
git init
git add package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts \
  components.json vitest.config.ts playwright.config.ts src/__tests__/setup.ts \
  src/app/globals.css public/
git commit -m "feat: bootstrap Next.js 14 project with testing tooling"
```

---

### Task 2: Docker Compose + environment setup

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore` (add `.env.local`)

**Interfaces:**
- Produces: `docker compose up -d` starts PostgreSQL (with pgvector), Redis, and MinIO on known ports. `DATABASE_URL` connects to local PostgreSQL.

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: ankane/pgvector:v0.5.1
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: english_learning
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ':9001'
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

- [ ] **Step 2: Create `.env.example`**

```bash
# ─── Authentication ───────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth (console.cloud.google.com → APIs & Services → Credentials)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# ─── Database ─────────────────────────────────────────────────
# Local: docker-compose postgres (default)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/english_learning
# Prod:  Railway PostgreSQL connection string

# ─── Redis ────────────────────────────────────────────────────
# Local: docker-compose redis
REDIS_URL=redis://localhost:6379
# Prod:  Railway Redis connection string

# ─── Object Storage (R2 / MinIO) ──────────────────────────────
# Local: MinIO (S3-compatible) via docker-compose
R2_ACCOUNT_ID=minioadmin
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
R2_BUCKET_NAME=english-learning
CLOUDFLARE_R2_ENDPOINT=http://localhost:9000

# Prod: Cloudflare R2 values:
# R2_ACCOUNT_ID=your-cloudflare-account-id
# R2_ACCESS_KEY_ID=your-r2-access-key-id
# R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
# R2_BUCKET_NAME=english-learning
# CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# ─── AI APIs ──────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here

# ─── Dev Flags ────────────────────────────────────────────────
# AI_MOCK_MODE=true → all AI generators return fixture data (Phase 2)
AI_MOCK_MODE=true
# DEV_BYPASS_AUTH=true → adds a Credentials provider for E2E tests
DEV_BYPASS_AUTH=false
```

- [ ] **Step 3: Create `.env.local` (copy and fill in)**

```bash
cp .env.example .env.local
```

Add to `.gitignore` if not already present:

```
.env.local
.env.*.local
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Paste the output as the value of `NEXTAUTH_SECRET` in `.env.local`.

- [ ] **Step 4: Start local services**

```bash
docker compose up -d
```

- [ ] **Step 5: Verify services are healthy**

```bash
docker compose ps
```

Expected: postgres, redis, minio all show `healthy` or `Up`.

```bash
docker compose exec postgres psql -U postgres -c '\l'
```

Expected: lists `english_learning` database.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat: add Docker Compose (postgres+pgvector, redis, minio) and env template"
```

---

### Task 3: Prisma schema + database migration

**Files:**
- Create: `prisma/schema.prisma`
- Modify: runs `prisma migrate dev` to create migration files under `prisma/migrations/`

**Interfaces:**
- Produces: all Phase 1 data models available via `PrismaClient`; pgvector extension enabled.
- Produces: `src/lib/prisma.ts` singleton for app-wide database access.

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` with a starter datasource. We will replace it entirely.

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// ─── NextAuth required models ────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accounts     Account[]
  sessions     Session[]
  profile      UserProfile?
  curricula    MonthlyCurriculum[]
  dailyLessons DailyLesson[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Application models ──────────────────────────────────────

model UserProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  level           Int      @default(1)
  diagnosticScore Int?
  currentMonth    Int      @default(1)
  currentDay      Int      @default(0)
  timezone        String   @default("Asia/Seoul")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model MonthlyCurriculum {
  id        String    @id @default(cuid())
  userId    String
  month     Int
  level     Int
  startDate DateTime
  endDate   DateTime?
  status    String    @default("active") // active | completed | paused
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  dailyLessons DailyLesson[]

  @@index([userId, month])
}

enum GenerationStatus {
  PENDING
  PARTIAL
  READY
  FAILED
}

model DailyLesson {
  id               String           @id @default(cuid())
  userId           String
  curriculumId     String
  studyDay         Int
  studyDate        DateTime         @db.Date
  generationStatus GenerationStatus @default(PENDING)
  frozenAt         DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  curriculum MonthlyCurriculum @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  artifacts  AIArtifact[]
  jobs       GenerationJob[]

  @@unique([userId, studyDate])
  @@index([userId, studyDay])
}

model AIArtifact {
  id               String   @id @default(cuid())
  dailyLessonId    String
  userId           String
  artifactType     String
  // Types: vocabulary_card | sentence_card | mnemonic_image | reading_passage |
  //        reading_question | speaking_scenario | writing_prompt | error_record
  studyDay         Int
  curriculumVersion Int     @default(1)
  difficultyLevel  Int      @default(1)
  generationSeed   String?
  modelVersion     String
  promptVersion    String
  generatedAt      DateTime @default(now())
  validationStatus String   @default("pending") // pending | passed | failed
  validationScore  Float?
  safetyStatus     String   @default("pending") // pending | safe | flagged
  payload          Json

  dailyLesson DailyLesson @relation(fields: [dailyLessonId], references: [id], onDelete: Cascade)

  @@map("ai_artifact")
  @@index([dailyLessonId, artifactType])
  @@index([userId, studyDay])
}

model GenerationJob {
  id            String    @id @default(cuid())
  dailyLessonId String
  jobType       String    // vocabulary | sentence | reading | speaking | writing | image
  status        String    @default("queued") // queued | processing | completed | failed
  attempts      Int       @default(0)
  lastError     String?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  dailyLesson DailyLesson @relation(fields: [dailyLessonId], references: [id], onDelete: Cascade)

  @@index([dailyLessonId, jobType])
  @@index([status])
}

model PromptVersion {
  id         String   @id @default(cuid())
  name       String   @unique
  version    String
  promptText String   @db.Text
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@index([name, isActive])
}

model ModelVersion {
  id        String   @id @default(cuid())
  provider  String   // anthropic | openai
  modelId   String   // claude-sonnet-4-6 | gpt-4o | whisper-1 | tts-1 | dall-e-3
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  @@index([provider, isActive])
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected:
```
✔ Your database is now in sync with your schema.
Generated Prisma Client
```

- [ ] **Step 4: Create `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Verify Prisma client works**

```bash
npx prisma studio
```

Expected: opens browser at http://localhost:5555 showing all model tables. Close when verified.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add Prisma schema with all Phase 1 models and pgvector extension"
```

---

### Task 4: NextAuth v5 — Google OAuth + middleware

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Modify: `src/app/layout.tsx` (add `auth.ts` type augmentation for `session.user.id`)

**Interfaces:**
- Produces: `auth()` server function — returns session or null from any server component.
- Produces: `signIn('google')` server action — redirects to Google OAuth.
- Produces: middleware that redirects unauthenticated users to `/login` and authenticated users away from `/login`.

- [ ] **Step 1: Write `src/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // DEV ONLY: bypass auth for E2E tests — never active in production
    ...(process.env.DEV_BYPASS_AUTH === 'true'
      ? [
          Credentials({
            credentials: { email: { label: 'Email', type: 'email' } },
            authorize: async (credentials) => {
              if (!credentials?.email) return null
              return prisma.user.findUnique({
                where: { email: credentials.email as string },
              })
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    session({ session, user }) {
      // Expose user.id on the session object (NextAuth v5 pattern)
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

- [ ] **Step 2: Write `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 3: Write `src/middleware.ts`**

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!(req as { auth: unknown }).auth
  const { pathname } = req.nextUrl

  const isAuthRoute = pathname.startsWith('/api/auth')
  const isLoginPage = pathname === '/login'
  const isPublic = isAuthRoute || isLoginPage

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/calendar', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Protect all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|ico|svg)$).*)'],
}
```

- [ ] **Step 4: Extend NextAuth session type**

Create `src/types/next-auth.d.ts`:

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

- [ ] **Step 5: Set Google OAuth redirect URI**

In Google Cloud Console (https://console.cloud.google.com):
1. APIs & Services → Credentials → your OAuth 2.0 Client
2. Authorized redirect URIs → Add: `http://localhost:3000/api/auth/callback/google`
3. Save

Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.

- [ ] **Step 6: Verify auth compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (Resolve any type errors before continuing.)

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/app/api/ src/middleware.ts src/types/
git commit -m "feat: add NextAuth v5 Google OAuth with Prisma adapter and route middleware"
```

---

### Task 5: DESIGN.md stub — design system

**Files:**
- Create: `DESIGN.md`

**Interfaces:**
- Produces: documented color themes, typography, spacing, animations, component conventions that Phase 4 implementation will follow.

- [ ] **Step 1: Write `DESIGN.md`**

```markdown
# Design System — AI 영어 학습 시스템

## Themes

Two modes — set by the parent layout, not `prefers-color-scheme`.

| Mode | Screens | Background | Text |
|------|---------|------------|------|
| `flashcard` | Vocabulary cards, Sentence cards, Review | `bg-white` | `text-gray-900` |
| `focus` | Calendar, Conversation, Reading, Writing | `bg-gray-950` | `text-gray-50` |

Implement via `data-mode` attribute on the outermost container:

```tsx
// Flashcard mode
<div data-mode="flashcard" className="min-h-screen bg-white text-gray-900">

// Focus mode (default for all learning screens)
<div data-mode="focus" className="min-h-screen bg-gray-950 text-gray-50">
```

## Typography

- Font: Inter (via `next/font/google`)
- Base: 16px (`text-base`)
- Scale: `text-sm` 14px · `text-base` 16px · `text-lg` 18px · `text-2xl` 24px · `text-3xl` 30px · `text-4xl` 36px
- Bold headings: `font-bold` or `font-semibold`

## Spacing

- Base unit: 4px
- Section gap: `space-y-6` (24px)
- Card padding: `p-4` (16px) standard, `p-6` (24px) for content cards
- Grid gap: `gap-3` (12px)
- Max content width: `max-w-md` (448px) on mobile; `max-w-2xl` (672px) on desktop

## Responsive Breakpoints (mobile-first)

| Breakpoint | Min Width | Primary Use |
|------------|-----------|-------------|
| default | 375px | Primary target — iPhone SE, thumb-only |
| `sm:` | 640px | Larger phones |
| `md:` | 768px | iPad — two-panel reading layout available |
| `lg:` | 1024px | Desktop — admin dashboard primary |

## Touch Targets

- Minimum interactive height: 44px (`min-h-[44px]`)
- Primary action buttons: `size="lg"` (48px height in shadcn/ui)
- Mic button (Phase 4b): 80px diameter minimum

## Animations

| Element | Duration | Easing |
|---------|----------|--------|
| Flashcard flip (CSS 3D rotateY) | 300ms | ease-in-out |
| Page transitions | 200ms | ease |
| Loading pulse | 1.5s | ease-in-out infinite |
| Mic ring pulse | 2s | ease-in-out infinite |
| Calendar day hover | 150ms | ease |

## Component Conventions (shadcn/ui)

| Component | Use |
|-----------|-----|
| `Button` size="lg" | Primary actions (full-width on mobile) |
| `Card` | Content containers |
| `Badge` | Status labels, card type indicators |
| `Progress` | Session completion bar |
| `Separator` | Section dividers |
| `Input`, `Label`, `Textarea` | Form elements |
| `Dialog` | Confirmations, image report modal |

## Flashcard-Specific Rules (Phase 4a)

- Full-screen card: 100vh, centered, no visible page chrome
- Card front: image occupies ≥60% height; word overlaid on image bottom
- Flip: CSS 3D `transform: rotateY(180deg)`, NOT slide
- Swipe right → "완벽", swipe left → "모름", swipe up → "앎", tap → flip
- Rating buttons (keyboard fallback): Space = flip, → = "완벽", ← = "모름", ↑ = "앎"

## Conversation Room Rules (Phase 4b)

- NOT chat bubbles — clean single-column AI text display
- Waveform visualization during speech (NOT static mic icon)
- Mic button only visible interactive element while speaking
- 5s silence: pulsing ring around mic (NOT a text timer)
- Auto-start: 2s after page load, AI sends opening greeting (no button)

## Reading Room Rules (Phase 4c)

- Two-panel: passage 60% left, question 40% right (768px+)
- Mobile: single-column, question fixed at bottom
- Evidence highlight: glow effect, NOT yellow highlight
- Question counter: "문제 2/6" → "문제 2/12 (적응형)"

## Accessibility Baseline

- All AI images: required `alt` text (MVP criterion #3)
- Keyboard nav: Tab to focus, Space/Enter to activate, Escape to dismiss
- No color-only feedback: pair color with icon or text
- Screen reader: use `aria-label` on icon-only buttons
- Voice optional: text input fallback on every voice interaction (MVP criterion #20)
```

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: add DESIGN.md design system stub (dual-theme, typography, component conventions)"
```

---

### Task 6: Root layout + providers

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/providers.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `auth()` from `@/auth` (server-side session check)
- Produces: root layout wrapping all pages with Inter font, Tailwind base styles, and SessionProvider.

- [ ] **Step 1: Write `src/components/providers.tsx`**

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

interface ProvidersProps {
  children: React.ReactNode
  session: Session | null
}

export function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

- [ ] **Step 2: Write `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { auth } from '@/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI 영어 학습',
  description: 'AI가 만드는 나만의 영어 커리큘럼',
  manifest: '/manifest.json',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write `src/app/page.tsx`**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth()

  if (session) {
    redirect('/calendar')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 4: Verify dev server still compiles**

```bash
npm run dev
```

Expected: no errors. Navigating to http://localhost:3000 redirects to /login (returns 404 since login page isn't created yet — that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/components/providers.tsx
git commit -m "feat: add root layout with Inter font, SessionProvider, and / redirect"
```

---

### Task 7: Login screen + auth-protected app layout

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(app)/layout.tsx`

**Interfaces:**
- Produces: `/login` renders Google sign-in button (white bg, focused style matching flashcard mode).
- Produces: `/(app)/layout.tsx` redirects unauthenticated users — second layer of protection beyond middleware.

- [ ] **Step 1: Write `src/app/(auth)/login/page.tsx`**

```typescript
import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/calendar')

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / branding */}
        <div className="text-center">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            AI 영어 학습
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            AI가 만드는 나만의 영어 커리큘럼
          </p>
        </div>

        {/* Sign-in form — server action */}
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/calendar' })
          }}
        >
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            size="lg"
          >
            Google로 계속하기
          </Button>
        </form>

        {/* Dev bypass — only visible when DEV_BYPASS_AUTH=true */}
        {process.env.DEV_BYPASS_AUTH === 'true' && (
          <form
            action={async (formData: FormData) => {
              'use server'
              const email = formData.get('email') as string
              const { signIn: devSignIn } = await import('@/auth')
              await devSignIn('credentials', { email, redirectTo: '/calendar' })
            }}
            className="space-y-2 border-t pt-4"
          >
            <p className="text-xs text-amber-600 font-medium">DEV ONLY</p>
            <input
              name="email"
              type="email"
              defaultValue="test@example.com"
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <Button type="submit" variant="outline" className="w-full" size="sm">
              Dev 로그인 (test@example.com)
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write `src/app/(app)/layout.tsx`**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return <>{children}</>
}
```

- [ ] **Step 3: Verify login page renders**

```bash
npm run dev
```

Navigate to http://localhost:3000 — should redirect to http://localhost:3000/login and show the "AI 영어 학습" login screen with the Google button. No errors in terminal.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/ src/app/\(app\)/layout.tsx
git commit -m "feat: add login screen with Google OAuth and auth-protected app layout"
```

---

### Task 8: Level diagnostic screen with tests

**Files:**
- Create: `src/components/diagnostic/DiagnosticForm.tsx`
- Create: `src/app/(app)/diagnostic/page.tsx`
- Create: `src/app/api/diagnostic/route.ts`
- Create: `src/__tests__/diagnostic.test.tsx`

**Interfaces:**
- Consumes: `session.user.id` from NextAuth `auth()`
- Produces: `DiagnosticForm` → on submit → `POST /api/diagnostic` with `{ score: number }` → creates/updates `UserProfile` → redirects to `/calendar`.
- Produces: `onComplete(score: number)` — score is 0–100, integer.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/diagnostic.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DiagnosticForm } from '@/components/diagnostic/DiagnosticForm'

describe('DiagnosticForm', () => {
  it('renders all 3 question categories', () => {
    render(<DiagnosticForm onComplete={() => {}} />)
    expect(screen.getByText('영어 텍스트를 읽을 때')).toBeInTheDocument()
    expect(screen.getByText('영어로 말할 때')).toBeInTheDocument()
    expect(screen.getByText('영어로 글을 쓸 때')).toBeInTheDocument()
  })

  it('submit button is disabled until all 3 questions answered', async () => {
    render(<DiagnosticForm onComplete={() => {}} />)
    const button = screen.getByRole('button', { name: '진단 완료' })
    expect(button).toBeDisabled()

    // Answer only 2 questions
    await userEvent.click(screen.getByLabelText('대부분의 단어를 모른다'))
    await userEvent.click(screen.getByLabelText('거의 말하지 못한다'))
    expect(button).toBeDisabled()
  })

  it('enables submit button when all 3 questions answered', async () => {
    render(<DiagnosticForm onComplete={() => {}} />)

    await userEvent.click(screen.getByLabelText('대부분의 단어를 모른다'))
    await userEvent.click(screen.getByLabelText('거의 말하지 못한다'))
    await userEvent.click(screen.getByLabelText('간단한 문장도 어렵다'))

    expect(screen.getByRole('button', { name: '진단 완료' })).toBeEnabled()
  })

  it('calls onComplete with 100 when all max scores selected', async () => {
    const onComplete = vi.fn()
    render(<DiagnosticForm onComplete={onComplete} />)

    await userEvent.click(screen.getByLabelText('학술 텍스트도 이해한다'))
    await userEvent.click(screen.getByLabelText('학술적 주제로 토론 가능하다'))
    await userEvent.click(screen.getByLabelText('학술 논문 수준으로 쓸 수 있다'))
    await userEvent.click(screen.getByRole('button', { name: '진단 완료' }))

    expect(onComplete).toHaveBeenCalledWith(100)
  })

  it('calls onComplete with 25 when all min scores (1/4) selected', async () => {
    const onComplete = vi.fn()
    render(<DiagnosticForm onComplete={onComplete} />)

    await userEvent.click(screen.getByLabelText('대부분의 단어를 모른다'))
    await userEvent.click(screen.getByLabelText('거의 말하지 못한다'))
    await userEvent.click(screen.getByLabelText('간단한 문장도 어렵다'))
    await userEvent.click(screen.getByRole('button', { name: '진단 완료' }))

    expect(onComplete).toHaveBeenCalledWith(25)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run diagnostic
```

Expected: FAIL — `Cannot find module '@/components/diagnostic/DiagnosticForm'`

- [ ] **Step 3: Write `src/components/diagnostic/DiagnosticForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const QUESTIONS = [
  {
    id: 'reading',
    label: '영어 텍스트를 읽을 때',
    options: [
      { value: 1, label: '대부분의 단어를 모른다' },
      { value: 2, label: '간단한 문장은 이해한다' },
      { value: 3, label: '일반 텍스트를 이해한다' },
      { value: 4, label: '학술 텍스트도 이해한다' },
    ],
  },
  {
    id: 'speaking',
    label: '영어로 말할 때',
    options: [
      { value: 1, label: '거의 말하지 못한다' },
      { value: 2, label: '간단한 표현은 가능하다' },
      { value: 3, label: '일상 대화가 가능하다' },
      { value: 4, label: '학술적 주제로 토론 가능하다' },
    ],
  },
  {
    id: 'writing',
    label: '영어로 글을 쓸 때',
    options: [
      { value: 1, label: '간단한 문장도 어렵다' },
      { value: 2, label: '단순한 문장은 쓸 수 있다' },
      { value: 3, label: '문단 수준의 글을 쓸 수 있다' },
      { value: 4, label: '학술 논문 수준으로 쓸 수 있다' },
    ],
  },
] as const

interface DiagnosticFormProps {
  onComplete: (score: number) => void
}

export function DiagnosticForm({ onComplete }: DiagnosticFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined)

  function handleSubmit() {
    const total = Object.values(answers).reduce((sum, v) => sum + v, 0)
    const score = Math.round((total / (QUESTIONS.length * 4)) * 100)
    onComplete(score)
  }

  return (
    <div className="space-y-4">
      {QUESTIONS.map((q) => (
        <Card key={q.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{q.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt.value}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                  transition-colors min-h-[44px]
                  ${answers[q.id] === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.value}
                  checked={answers[q.id] === opt.value}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                  aria-label={opt.label}
                  className="sr-only"
                />
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 flex-shrink-0
                    ${answers[q.id] === opt.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                    }
                  `}
                  aria-hidden="true"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full min-h-[44px]"
        size="lg"
      >
        진단 완료
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --run diagnostic
```

Expected: 5/5 tests PASS.

- [ ] **Step 5: Write `src/app/api/diagnostic/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const score = typeof body.score === 'number' ? Math.round(body.score) : null

  if (score === null || score < 0 || score > 100) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  const level = score >= 75 ? 3 : score >= 40 ? 2 : 1

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: { diagnosticScore: score, level },
    create: {
      userId: session.user.id,
      diagnosticScore: score,
      level,
      currentDay: 0,
    },
  })

  return NextResponse.json({ ok: true, level })
}
```

- [ ] **Step 6: Write `src/app/(app)/diagnostic/page.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { DiagnosticForm } from '@/components/diagnostic/DiagnosticForm'

export default function DiagnosticPage() {
  const router = useRouter()

  async function handleComplete(score: number) {
    const res = await fetch('/api/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })

    if (res.ok) {
      router.push('/calendar')
    }
  }

  return (
    <main
      data-mode="focus"
      className="min-h-screen bg-gray-950 text-gray-50 px-4 py-8"
    >
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">레벨 진단</h1>
          <p className="mt-1 text-sm text-gray-400">
            현재 영어 실력을 알려주세요. 커리큘럼을 맞춤 조정합니다.
          </p>
        </div>
        <DiagnosticForm onComplete={handleComplete} />
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/diagnostic/ src/app/\(app\)/diagnostic/ \
  src/app/api/diagnostic/ src/__tests__/diagnostic.test.tsx
git commit -m "feat: add level diagnostic screen with 3-question form and score API"
```

---

### Task 9: Monthly calendar component with tests

**Files:**
- Create: `src/components/calendar/MonthCalendar.tsx`
- Create: `src/__tests__/calendar.test.tsx`

**Interfaces:**
- Consumes: `days: { dayNumber: number; status: 'completed' | 'in-progress' | 'today' | 'locked' | 'future' }[]`, `currentDay: number`
- Produces: `<div role="grid" aria-label="20일 학습 캘린더">` with 20 `role="gridcell"` children, each showing day number and status.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/calendar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'

type Status = 'completed' | 'in-progress' | 'today' | 'locked' | 'future'

function makeDays(count: number, status: Status = 'future') {
  return Array.from({ length: count }, (_, i) => ({
    dayNumber: i + 1,
    status,
  }))
}

describe('MonthCalendar', () => {
  it('renders exactly 20 day cells', () => {
    render(<MonthCalendar days={makeDays(20)} currentDay={1} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(20)
  })

  it('has accessible grid label', () => {
    render(<MonthCalendar days={makeDays(20)} currentDay={1} />)
    expect(
      screen.getByRole('grid', { name: '20일 학습 캘린더' })
    ).toBeInTheDocument()
  })

  it('applies scale-110 class to the current-day cell', () => {
    const days = makeDays(20)
    days[2].status = 'today'
    render(<MonthCalendar days={days} currentDay={3} />)

    const todayCell = screen.getByRole('gridcell', { name: /Day 3/i })
    expect(todayCell.className).toContain('scale-110')
  })

  it('applies bg-green-500 class to completed cells', () => {
    const days = makeDays(20)
    days[0].status = 'completed'
    days[1].status = 'completed'
    render(<MonthCalendar days={days} currentDay={3} />)

    const day1 = screen.getByRole('gridcell', { name: /Day 1: completed/i })
    const day2 = screen.getByRole('gridcell', { name: /Day 2: completed/i })
    expect(day1.className).toContain('bg-green-500')
    expect(day2.className).toContain('bg-green-500')
  })

  it('applies cursor-not-allowed to locked cells', () => {
    const days = makeDays(20, 'locked')
    render(<MonthCalendar days={days} currentDay={0} />)
    const cells = screen.getAllByRole('gridcell')
    cells.forEach((cell) => expect(cell.className).toContain('cursor-not-allowed'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run calendar
```

Expected: FAIL — `Cannot find module '@/components/calendar/MonthCalendar'`

- [ ] **Step 3: Write `src/components/calendar/MonthCalendar.tsx`**

```typescript
type DayStatus = 'completed' | 'in-progress' | 'today' | 'locked' | 'future'

interface Day {
  dayNumber: number
  status: DayStatus
}

interface MonthCalendarProps {
  days: Day[]
  currentDay: number
}

export function MonthCalendar({ days, currentDay }: MonthCalendarProps) {
  return (
    <div
      role="grid"
      aria-label="20일 학습 캘린더"
      className="grid grid-cols-5 gap-3"
    >
      {days.map((day) => (
        <DayCell
          key={day.dayNumber}
          day={day}
          isToday={day.dayNumber === currentDay}
        />
      ))}
    </div>
  )
}

const STATUS_CLASSES: Record<DayStatus, string> = {
  completed: 'bg-green-500 text-white border-green-600',
  'in-progress': 'bg-blue-500 text-white border-blue-600',
  today: 'bg-white text-gray-900 border-2 border-blue-500 font-bold shadow-lg',
  locked: 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed',
  future: 'bg-gray-800 text-gray-400 border-gray-700',
}

function DayCell({ day, isToday }: { day: Day; isToday: boolean }) {
  return (
    <div
      role="gridcell"
      aria-label={`Day ${day.dayNumber}: ${day.status}`}
      className={`
        flex flex-col items-center justify-center
        aspect-square rounded-xl border
        text-sm transition-all duration-150
        ${STATUS_CLASSES[day.status]}
        ${isToday ? 'scale-110' : ''}
        ${day.status === 'completed' ? 'hover:scale-105 cursor-pointer' : ''}
      `}
    >
      <span className="text-lg font-bold leading-none">{day.dayNumber}</span>
      {day.status === 'completed' && (
        <span className="text-xs mt-0.5" aria-hidden="true">✓</span>
      )}
      {isToday && day.status !== 'completed' && (
        <span className="text-[10px] mt-0.5 font-normal">오늘</span>
      )}
      {day.status === 'in-progress' && (
        <span className="text-[10px] mt-0.5 animate-pulse">진행 중</span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --run calendar
```

Expected: 5/5 tests PASS.

- [ ] **Step 5: Run all tests together**

```bash
npm test -- --run
```

Expected: all tests pass (diagnostic + calendar).

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/ src/__tests__/calendar.test.tsx
git commit -m "feat: add MonthCalendar component with day status display and accessibility"
```

---

### Task 10: Calendar page + today's lesson placeholder

**Files:**
- Create: `src/app/(app)/calendar/page.tsx`
- Create: `src/app/(app)/today/page.tsx`

**Interfaces:**
- Consumes: Prisma `userProfile`, `dailyLesson` records for the authenticated user.
- Produces: `/calendar` renders `MonthCalendar` with real DB data. "오늘 학습 시작" button links to `/today`.
- Produces: `/today` renders a placeholder with links to future learning modules.

- [ ] **Step 1: Write `src/app/(app)/calendar/page.tsx`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type DayStatus = 'completed' | 'in-progress' | 'today' | 'locked' | 'future'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  })

  // New users who skipped diagnostic start at level 1
  const currentDay = profile?.currentDay ?? 0
  const userName = session.user.name?.split(' ')[0] ?? '학습자'

  const lessons = await prisma.dailyLesson.findMany({
    where: { userId: session.user.id },
    orderBy: { studyDay: 'asc' },
    select: {
      studyDay: true,
      generationStatus: true,
      studyDate: true,
      frozenAt: true,
    },
  })

  const lessonMap = new Map(lessons.map((l) => [l.studyDay, l]))

  const days = Array.from({ length: 20 }, (_, i) => {
    const dayNumber = i + 1
    const lesson = lessonMap.get(dayNumber)

    let status: DayStatus = 'future'

    if (dayNumber === currentDay) {
      status = 'today'
    } else if (dayNumber < currentDay) {
      status = lesson?.frozenAt ? 'completed' : 'locked'
    } else if (dayNumber === currentDay + 1) {
      if (lesson?.generationStatus === 'PARTIAL' || lesson?.generationStatus === 'PENDING') {
        status = 'in-progress'
      }
    }

    return { dayNumber, status }
  })

  return (
    <main
      data-mode="focus"
      className="min-h-screen bg-gray-950 text-gray-50"
    >
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              안녕하세요, {userName}님
            </p>
            <h1 className="text-2xl font-bold">월 1 커리큘럼</h1>
            <p className="text-sm text-gray-400">20일 학습 과정</p>
          </div>
          <div
            className="text-right text-sm text-gray-400"
            aria-label="진행 상황"
          >
            <p className="text-2xl font-bold text-white">{currentDay}</p>
            <p className="text-xs">/ 20일</p>
          </div>
        </div>

        {/* Calendar grid */}
        <MonthCalendar days={days} currentDay={currentDay} />

        {/* Today CTA */}
        <Link href="/today">
          <Button className="w-full min-h-[48px]" size="lg">
            {currentDay === 0 ? '학습 시작하기' : '오늘 학습 시작'}
          </Button>
        </Link>

        {/* Diagnostic link for users without a profile */}
        {!profile && (
          <p className="text-center text-sm text-gray-500">
            <Link href="/diagnostic" className="underline hover:text-gray-300">
              레벨 진단 받기
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write `src/app/(app)/today/page.tsx`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lesson = await prisma.dailyLesson.findUnique({
    where: { userId_studyDate: { userId: session.user.id, studyDate: today } },
    include: { artifacts: { select: { artifactType: true } } },
  })

  const modules = [
    { label: '단어 플립 카드', href: '/vocabulary', available: false, emoji: '📖' },
    { label: '문장 암기 카드', href: '/sentences', available: false, emoji: '💬' },
    { label: 'AI 회화실', href: '/conversation', available: false, emoji: '🎤' },
    { label: '적응형 읽기', href: '/reading', available: false, emoji: '📰' },
    { label: 'AI 작문실', href: '/writing', available: false, emoji: '✍️' },
    { label: '오류 복습', href: '/errors', available: false, emoji: '🔄' },
  ]

  const isPackageReady = lesson?.generationStatus === 'READY'

  return (
    <main
      data-mode="focus"
      className="min-h-screen bg-gray-950 text-gray-50"
    >
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">오늘의 학습</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isPackageReady
              ? '오늘의 학습 패키지가 준비되었습니다.'
              : '학습 패키지를 준비하는 중입니다...'}
          </p>
        </div>

        {!isPackageReady && (
          <div className="rounded-xl border border-gray-800 p-6 text-center space-y-3">
            <div className="text-4xl animate-spin">⏳</div>
            <p className="text-sm text-gray-400">세션 준비 중...</p>
            <p className="text-xs text-gray-600">
              AI가 오늘의 학습 자료를 생성하고 있습니다. 잠시 후 새로고침해 주세요.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {modules.map((mod) => (
            <div
              key={mod.href}
              className="flex items-center gap-4 rounded-xl border border-gray-800 p-4 opacity-50 cursor-not-allowed"
              aria-disabled="true"
            >
              <span className="text-2xl" aria-hidden="true">{mod.emoji}</span>
              <span className="text-sm font-medium">{mod.label}</span>
              <span className="ml-auto text-xs text-gray-600">준비 중</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600">
          학습 모듈은 Phase 4에서 구현됩니다.
        </p>

        <Link href="/calendar">
          <Button variant="outline" className="w-full" size="sm">
            캘린더로 돌아가기
          </Button>
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify both pages compile**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/calendar/ src/app/\(app\)/today/
git commit -m "feat: add calendar page with 20-day grid and today's lesson placeholder"
```

---

### Task 11: Seed script + generate-today placeholder

**Files:**
- Create: `prisma/seed.ts`
- Create: `scripts/generate-today.ts`
- Modify: `package.json` (add `prisma.seed` config)

**Interfaces:**
- Produces: `npm run db:seed` → creates test user `test@example.com` with UserProfile, 1-month curriculum, today's DailyLesson (READY), and 3 mock vocabulary AIArtifacts.
- Produces: `npm run generate:today` → prints placeholder message (implemented in Phase 3).

- [ ] **Step 1: Write `prisma/seed.ts`**

```typescript
import { PrismaClient, GenerationStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: '테스트 사용자',
      profile: {
        create: {
          level: 2,
          diagnosticScore: 45,
          currentMonth: 1,
          currentDay: 1,
        },
      },
    },
    include: { profile: true },
  })

  console.log(`✅ User: ${user.email} (id: ${user.id})`)

  // Month 1 curriculum
  const curriculum = await prisma.monthlyCurriculum.upsert({
    where: { id: 'seed-curriculum-month1' },
    update: {},
    create: {
      id: 'seed-curriculum-month1',
      userId: user.id,
      month: 1,
      level: 2,
      startDate: new Date(),
      status: 'active',
    },
  })

  console.log(`✅ Curriculum: Month 1 (id: ${curriculum.id})`)

  // Today's daily lesson — pre-generated and frozen
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lesson = await prisma.dailyLesson.upsert({
    where: {
      userId_studyDate: { userId: user.id, studyDate: today },
    },
    update: {},
    create: {
      userId: user.id,
      curriculumId: curriculum.id,
      studyDay: 1,
      studyDate: today,
      generationStatus: GenerationStatus.READY,
      frozenAt: new Date(),
    },
  })

  console.log(`✅ DailyLesson: Day 1, ${today.toISOString().split('T')[0]} (id: ${lesson.id})`)

  // 3 mock vocabulary cards (no real images — imageSource: 'text')
  const mockWords = [
    {
      word: 'mitigate',
      pos: 'verb',
      definition: 'to reduce the harmful effects of something',
      koreanMeaning: '완화하다, 줄이다',
      example: 'The new policy helped to mitigate the risk of accidents.',
      mnemonic: 'The umbrella mitigates the impact of the storm.',
      collocations: ['mitigate risks', 'mitigate damage', 'mitigate the effects'],
      confusableWords: [{ word: 'alleviate', relationship: 'similar_meaning', note: 'alleviate emphasizes relief from suffering; mitigate reduces severity' }],
    },
    {
      word: 'alleviate',
      pos: 'verb',
      definition: 'to make something less severe or difficult to endure',
      koreanMeaning: '경감하다, 완화하다',
      example: 'The medication helped to alleviate the pain.',
      mnemonic: 'Like levitating — lifting the burden away from you.',
      collocations: ['alleviate pain', 'alleviate suffering', 'alleviate concerns'],
      confusableWords: [{ word: 'mitigate', relationship: 'similar_meaning', note: 'mitigate reduces severity; alleviate relieves discomfort' }],
    },
    {
      word: 'exacerbate',
      pos: 'verb',
      definition: 'to make a problem, bad situation, or negative feeling worse',
      koreanMeaning: '악화시키다',
      example: 'The drought exacerbated the already severe food shortage.',
      mnemonic: 'Extra + acerbate — extra bitter, extra bad.',
      collocations: ['exacerbate a problem', 'exacerbate tensions', 'exacerbate symptoms'],
      confusableWords: [{ word: 'aggravate', relationship: 'similar_meaning', note: 'both mean to worsen; aggravate can also mean to irritate a person' }],
    },
  ]

  for (const [i, word] of mockWords.entries()) {
    const artifactId = `seed-vocab-day1-${i + 1}`
    await prisma.aIArtifact.upsert({
      where: { id: artifactId },
      update: {},
      create: {
        id: artifactId,
        dailyLessonId: lesson.id,
        userId: user.id,
        artifactType: 'vocabulary_card',
        studyDay: 1,
        curriculumVersion: 1,
        difficultyLevel: 2,
        modelVersion: 'seed-mock-v1',
        promptVersion: 'vocabulary_generator_v1',
        validationStatus: 'passed',
        validationScore: 1.0,
        safetyStatus: 'safe',
        payload: {
          word: word.word,
          pos: word.pos,
          definition: word.definition,
          koreanMeaning: word.koreanMeaning,
          example: word.example,
          mnemonic: word.mnemonic,
          collocations: word.collocations,
          confusableWords: word.confusableWords,
          imageUrl: null,
          imageAlt: `연상 이미지: ${word.mnemonic}`,
          imageSource: 'text',
          generationSeed: `seed-mock-${i}`,
        },
      },
    })
    console.log(`✅ VocabCard: ${word.word}`)
  }

  // Register active model versions
  await prisma.modelVersion.upsert({
    where: { id: 'model-claude-sonnet' },
    update: {},
    create: {
      id: 'model-claude-sonnet',
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      isActive: true,
    },
  })

  await prisma.modelVersion.upsert({
    where: { id: 'model-openai-tts' },
    update: {},
    create: {
      id: 'model-openai-tts',
      provider: 'openai',
      modelId: 'tts-1',
      isActive: true,
    },
  })

  console.log('\n🎉 Seed complete.')
  console.log('\nDev login credentials:')
  console.log('  Email: test@example.com')
  console.log('  (Set DEV_BYPASS_AUTH=true in .env.local to use)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add Prisma seed config to `package.json`**

In `package.json`, add at the top level (alongside `"scripts"`):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Write `scripts/generate-today.ts`**

```typescript
// Placeholder — implemented in Phase 3 (LearningScheduleEngine)
// Phase 3 will add: BullMQ job trigger → DailyPlanner → 10 AI generators → DailyLesson.READY

console.log('⚠️  generate-today is a Phase 3 feature.')
console.log('    For now, use `npm run db:seed` to seed mock lesson data.')
console.log('    Phase 3 will implement the real generation pipeline.')
```

- [ ] **Step 4: Run the seed**

```bash
npm run db:seed
```

Expected output:
```
🌱 Seeding database...
✅ User: test@example.com (id: cl...)
✅ Curriculum: Month 1 (id: seed-curriculum-month1)
✅ DailyLesson: Day 1, 2026-06-23 (id: cl...)
✅ VocabCard: mitigate
✅ VocabCard: alleviate
✅ VocabCard: exacerbate
🎉 Seed complete.
```

- [ ] **Step 5: Set `DEV_BYPASS_AUTH=true` and verify login works**

In `.env.local`, set:
```
DEV_BYPASS_AUTH=true
```

```bash
npm run dev
```

Navigate to http://localhost:3000/login. The "DEV ONLY" section should appear. Click "Dev 로그인 (test@example.com)". Expected: redirect to `/calendar` showing the 20-day grid with Day 1 highlighted as "오늘".

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts scripts/generate-today.ts package.json
git commit -m "feat: add seed script with test user, Day 1 lesson, and 3 mock vocabulary cards"
```

---

### Task 12: README.md + E2E smoke test

**Files:**
- Create: `README.md`
- Create: `e2e/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test:e2e` runs 2 smoke tests that pass without Google OAuth credentials.
- Produces: `README.md` with 8-step getting-started guide (20-minute target for new developer).

- [ ] **Step 1: Write the failing E2E test**

```typescript
// e2e/smoke.test.ts
import { test, expect } from '@playwright/test'

test('login page renders correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'AI 영어 학습' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible()
})

test('unauthenticated user redirected from /calendar to /login', async ({ page }) => {
  await page.goto('/calendar')
  await expect(page).toHaveURL(/\/login/)
})

test('dev login flow: seed user can reach calendar', async ({ page }) => {
  // Only runs when DEV_BYPASS_AUTH=true
  if (process.env.DEV_BYPASS_AUTH !== 'true') {
    test.skip()
    return
  }

  await page.goto('/login')
  await expect(page.getByText('DEV ONLY')).toBeVisible()

  await page.fill('input[name="email"]', 'test@example.com')
  await page.click('button:has-text("Dev 로그인")')

  await expect(page).toHaveURL('/calendar')
  await expect(page.getByRole('grid', { name: '20일 학습 캘린더' })).toBeVisible()
  await expect(page.getByRole('button', { name: '오늘 학습 시작' })).toBeVisible()
})
```

- [ ] **Step 2: Run E2E test (first 2 tests should pass)**

```bash
npm run dev &   # Start dev server in background if not running
npm run test:e2e
```

Expected: tests 1 and 2 PASS; test 3 is skipped (DEV_BYPASS_AUTH not set yet).

Then set `DEV_BYPASS_AUTH=true` and run again:

```bash
DEV_BYPASS_AUTH=true npm run test:e2e
```

Expected: all 3 tests PASS.

- [ ] **Step 3: Write `README.md`**

```markdown
# AI 영어 학습 시스템

AI가 생성하고 학습 엔진이 통제하는 반응형 영어 학습 PWA.

## 사전 요구사항

- Node.js 20+
- Docker (PostgreSQL + Redis + MinIO 로컬 실행)
- API 키: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- Google OAuth 클라이언트 (Google Cloud Console)

## 시작하기

### 1. 설치

```bash
git clone <repo-url>
cd english-learning
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음을 입력하세요:
- `NEXTAUTH_SECRET`: `openssl rand -base64 32` 출력값
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google Cloud Console에서 발급
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`: 각 API 서비스에서 발급

> 로컬 개발에서는 `DATABASE_URL`, `REDIS_URL`, `R2_*` 변수는 기본값 그대로 사용하세요 (Docker 컨테이너 연결).

### 3. 로컬 서비스 시작

```bash
docker compose up -d
```

### 4. 데이터베이스 마이그레이션

```bash
npm run db:migrate
```

### 5. 시드 데이터 생성

```bash
npm run db:seed
```

테스트 사용자 `test@example.com`과 오늘의 학습 패키지(모의 데이터)를 생성합니다.

### 6. 개발 서버 시작

```bash
npm run dev
```

http://localhost:3000 에서 앱을 확인할 수 있습니다.

### 7. 첫 세션 체험 (개발 전용 로그인)

`.env.local`에 다음을 추가:
```
DEV_BYPASS_AUTH=true
```

서버를 재시작한 후 `/login` 하단의 "Dev 로그인" 버튼으로 로그인하세요.

### 8. 테스트 실행

```bash
npm test          # 단위/컴포넌트 테스트 (Vitest)
npm run test:e2e  # E2E 테스트 (Playwright)
```

## 개발 커맨드

| 커맨드 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm test` | Vitest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `npm run db:migrate` | Prisma 마이그레이션 실행 |
| `npm run db:seed` | 시드 데이터 생성 |
| `npm run generate:today` | 오늘 학습 패키지 생성 (Phase 3 이후) |
| `npx prisma studio` | Prisma DB 브라우저 |
| `docker compose up -d` | 로컬 서비스 시작 |
| `docker compose down` | 로컬 서비스 종료 |

## 아키텍처

전체 아키텍처와 구현 계획은 [PLAN.md](PLAN.md)를, 요구사항 명세는 [SPEC.md](SPEC.md)를 참조하세요.

```
[반응형 웹/PWA — Next.js 14]
        │
        ▼
[API 서버 — Next.js App Router]
        │
        ├── 학습 일정 엔진 (Phase 3)
        ├── 고정 분량 제어 엔진 (Phase 3)
        │
        ▼
[AI Orchestration (Phase 2)]
        ├── VocabularyGenerator
        ├── ImageGenerator
        ├── ReadingGenerator
        └── ...
        │
        ▼
[PostgreSQL + pgvector | Redis + BullMQ | Cloudflare R2]
```

## Phase 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 기반 (인증, DB, 기본 화면) | ✅ 완료 |
| 2 | AI Orchestration Service | 📋 계획됨 |
| 3 | 학습 엔진 | 📋 계획됨 |
| 4 | 핵심 학습 화면 | 📋 계획됨 |
| 5 | 진도 관리 + PWA | 📋 계획됨 |
| 6 | 개인정보 + 접근성 + 성능 | 📋 계획됨 |
```

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run && npm run test:e2e
```

Expected: all unit tests PASS, all E2E tests PASS (3rd E2E test skipped without `DEV_BYPASS_AUTH=true`).

- [ ] **Step 5: Commit**

```bash
git add README.md e2e/
git commit -m "feat: add README getting-started guide and Playwright E2E smoke tests"
```

---

### Phase 1 Acceptance Test

**Completion criterion (from PLAN.md):** "로그인 → 캘린더 화면까지 이동 가능"

- [ ] **Step 1: Set DEV_BYPASS_AUTH=true in .env.local**

- [ ] **Step 2: Restart dev server**

```bash
npm run dev
```

- [ ] **Step 3: Verify full flow manually**

1. Navigate to http://localhost:3000 → redirects to `/login`
2. Click "Dev 로그인 (test@example.com)" → redirects to `/calendar`
3. See 20-day grid with Day 1 highlighted as "오늘"
4. Click "오늘 학습 시작" → navigates to `/today` showing placeholder modules
5. Click "캘린더로 돌아가기" → returns to `/calendar`
6. Navigate to `/diagnostic` → see 3-question form; answer all → submit → redirects to `/calendar`

- [ ] **Step 4: Run all tests**

```bash
npm test -- --run
DEV_BYPASS_AUTH=true npm run test:e2e
```

Expected: all tests PASS.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — login, calendar, diagnostic screens with full test coverage"
```

---

## Self-Review

**Spec coverage check:**

| SPEC.md Section | Covered in Phase 1? |
|-----------------|---------------------|
| §1.1 반응형 웹/PWA | ✅ Next.js App Router; PWA manifest in Phase 5 |
| §1.2 음성 기능 | ⏩ Phase 4b |
| §1.3 접근성 (alt text, keyboard) | ⏩ Phase 4 + Phase 6; DESIGN.md documents baseline |
| §2 일일 고정 학습량 | ⏩ Phase 3 (FixedVolumeControlEngine) |
| §3 매일 학습 흐름 | ✅ `/today` page shows module sequence (placeholder) |
| §4.4 AI 콘텐츠 버전 관리 | ✅ `AIArtifact` schema includes all required fields |
| §5–6 플립 카드 | ⏩ Phase 4a |
| §7 복습 규칙 | ⏩ Phase 3 (ReviewQueueEngine) |
| §8–10 읽기 | ⏩ Phase 4c |
| §13 회화 | ⏩ Phase 4b |
| §15 학습자 화면 | ✅ Login, Calendar, Diagnostic, Today (placeholder) |
| §16 핵심 데이터 객체 | ✅ All Phase 1 objects in schema.prisma |
| §17 성능 목표 | ⏩ Phase 6 |
| §19 개인정보 | ⏩ Phase 6 |
| §20 MVP 수용 기준 #1 (다기기 계정) | ✅ NextAuth + PostgreSQL session |
| §20 MVP 수용 기준 #17 (새로고침 불변) | ✅ `DailyLesson` in DB (confirmed immutable) |
| §20 MVP 수용 기준 #20 (음성 없이 완료) | ⏩ Phase 4b text fallback |
| §21 시스템 구성 | ✅ Architecture matched by project structure |

**No placeholder scan violations found.** All steps contain actual code.

**Type consistency:** `DayStatus` is defined in `MonthCalendar.tsx` and used identically in `calendar/page.tsx`. `AIArtifact.payload` is `Json` — consuming code casts to typed shape at read time (implemented in Phase 4).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-phase1-foundation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration.
Use skill: `superpowers:subagent-driven-development`

**2. Inline Execution** — Execute tasks in this session using the executing-plans skill.
Use skill: `superpowers:executing-plans`

**Future phases** (each needs its own plan before implementation):
- `Phase 2`: AI Orchestration — BaseGenerator, VocabularyGenerator, ImageGenerator, ReadingGenerator, SpeakingScenarioGenerator, WritingGenerator, ValidationAgent, EvaluationAgent, DailyPlanner, PromptLoader
- `Phase 3`: Learning Engine — LearningScheduleEngine, FixedVolumeControlEngine, ReviewQueueEngine, BullMQ, cron job, pgvector duplicate detection
- `Phase 4b`: AI Conversation Room (conversation-first per Decision D9=A)
- `Phase 4a`: Flashcard System (after 4b)
- `Phase 4c–4e`: Reading, Writing, Error Review
- `Phase 5`: Progress tracking, PWA manifest, admin dashboard
- `Phase 6`: Privacy, accessibility audit, performance optimization
