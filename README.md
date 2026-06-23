# AI 영어 학습 시스템

An AI-powered English learning PWA for daily structured practice sessions.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- API keys: Anthropic (Claude), OpenAI (Whisper + TTS)
- Google Cloud Console OAuth credentials

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd english-learning
npm install
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- `ANTHROPIC_API_KEY` (from [Anthropic Console](https://console.anthropic.com))
- `OPENAI_API_KEY` (from [OpenAI Platform](https://platform.openai.com))
- `NEXTAUTH_SECRET` — generate with: `openssl rand -base64 32`

All other values work out of the box with Docker Compose.

### 3. Start local services

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432), Redis (6379), and MinIO/R2 mock (9000).

### 4. Database setup

```bash
npm run db:migrate
```

### 5. Seed development data

```bash
npm run db:seed
```

Creates a test user, 20-day curriculum, and today's mock lesson.

### 6. Generate today's lesson (if needed)

```bash
npm run generate:today
```

Triggers AI generation for today's daily package (requires real API keys).

### 7. Start development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

**First session:** Visit `/today` → 2 seconds → AI greets you automatically.

## Development Tips

- `AI_MOCK_MODE=true` in `.env.local` — all AI generators return fixture data (fast, no cost)
- `DEV_BYPASS_AUTH=true` — skip Google OAuth login in local dev
- MinIO Console: [http://localhost:9001](http://localhost:9001) (user: `minioadmin`, pass: `minioadmin123`)

## Architecture

See `PLAN.md` for the full implementation plan and `SPEC.md` for the product specification.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 (Google OAuth) |
| Database | PostgreSQL 16 + Prisma ORM + pgvector |
| Queue | BullMQ + Redis |
| Storage | Cloudflare R2 (prod) / MinIO (dev) |
| LLM | Claude Sonnet 4.6 |
| STT | OpenAI Whisper |
| TTS | OpenAI TTS |
| Hosting | Vercel (frontend) + Railway (API server) |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm test` | Run Jest tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed development data |
| `npm run generate:today` | Trigger today's lesson generation |
