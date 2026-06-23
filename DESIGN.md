# Design System

This document is the visual contract for the AI 영어 학습 시스템. All Phase 4 screens must implement these specifications.

## Themes

The app uses two distinct visual modes — not a light/dark toggle, but two cognitive environments:

| Mode | Class | Use Case | Rationale |
|------|-------|----------|-----------|
| `flashcard` | `.mode-flashcard` | Flashcard screens only | High-contrast, bright — quick recognition |
| `focus` | `.mode-focus` | Conversation, Reading, Writing, Error Review | Dark, muted — deep concentration |

**How to apply:** Set `mode-flashcard` or `mode-focus` on the nearest layout wrapper. The global CSS (globals.css) defines the CSS variables for each mode.

## Color Palette

### Flashcard Mode (`.mode-flashcard`)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `0 0% 100%` (white) | Card background |
| `--foreground` | `222.2 84% 4.9%` (near-black) | Primary text |
| `--card` | `0 0% 100%` | Card surface |
| `--card-foreground` | `222.2 84% 4.9%` | Card text |
| `--primary` | `221.2 83.2% 53.3%` (blue) | Correct / CTA |
| `--primary-foreground` | `210 40% 98%` | Text on primary |
| `--muted` | `210 40% 96.1%` | Subtle backgrounds |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Secondary text |
| `--border` | `214.3 31.8% 91.4%` | Borders |
| `--accent` | `210 40% 96.1%` | Hover states |
| `--destructive` | `0 84.2% 60.2%` (red) | Wrong / Error |

### Focus Mode (`.mode-focus`)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `222.2 84% 4.9%` (near-black `bg-gray-950`) | Screen background |
| `--foreground` | `210 40% 98%` (near-white) | Primary text |
| `--card` | `217.2 32.6% 17.5%` (dark slate) | Card/panel surface |
| `--card-foreground` | `210 40% 98%` | Card text |
| `--primary` | `217.2 91.2% 59.8%` (bright blue — readable on dark) | CTA / active state |
| `--primary-foreground` | `222.2 84% 4.9%` | Text on primary |
| `--muted` | `217.2 32.6% 17.5%` | Subtle backgrounds |
| `--muted-foreground` | `215 20.2% 65.1%` | Secondary/supporting text |
| `--border` | `217.2 32.6% 17.5%` | Borders |
| `--accent` | `217.2 32.6% 17.5%` | Hover states |
| `--destructive` | `0 62.8% 30.6%` (dark red) | Error states |

## Typography

| Scale | Class | Size | Weight | Use |
|-------|-------|------|--------|-----|
| Display | `text-4xl font-bold` | 36px | 700 | Screen titles (e.g., word on flashcard front) |
| Heading | `text-2xl font-semibold` | 24px | 600 | Section headers |
| Body | `text-base` | 16px (base) | 400 | Body text, questions |
| Caption | `text-sm` | 14px | 400 | Labels, metadata, counters |
| Micro | `text-xs` | 12px | 400 | Badges, status indicators |

Font: **Inter** (loaded via `next/font/google` — already configured in app/layout.tsx).

## Spacing

Base unit: **4px** (Tailwind default). All spacing in the app uses Tailwind spacing scale.

Standard gaps:
- Card internal padding: `p-6` (24px)
- Section gaps: `gap-4` or `gap-6`
- Screen horizontal padding: `px-4` (mobile) → `px-8` (desktop)

## Animation

| Animation | Duration | Easing | Tailwind class |
|-----------|----------|--------|----------------|
| Flashcard flip | 300ms | ease-in-out | Custom (see CSS below) |
| Page transition | 200ms | ease-out | `transition-all duration-200` |
| Loading pulse | 1.5s | ease-in-out | `animate-pulse` |
| Mic recording ring | 2s | ease-in-out | `animate-ping` |

## Responsive Breakpoints

| Name | Width | Primary use |
|------|-------|-------------|
| mobile | 375px | Primary target. All interactions work thumb-only. |
| tablet | 768px (`md:`) | Two-panel reading layout available. |
| desktop | 1024px (`lg:`) | Full layout. Admin dashboard primary. |

## Components

### Flashcard (full-screen)
- Card occupies **100% viewport height** (`h-screen`)
- CSS 3D flip transform: `rotateY(180deg)`, 300ms, `transform-style: preserve-3d`
- Image takes ≥60% of card front. Word overlaid on image, NOT below.
- Swipe right → "완벽", swipe left → "모름", swipe up → "앎", tap center → flip

### Conversation Room
- NOT chat bubbles — AI text in clean single-column display
- Waveform animation during speaking (not a progress bar)
- Mic button: only interactive element while speaking
- 5s silence: pulsing ring around mic (NOT text notification)

### Reading Room (two-panel)
- Passage: 60% width (left), independent scroll
- Question: 40% width (right), sticky panel
- Evidence highlight: glow effect (`shadow-[0_0_12px_rgba(59,130,246,0.6)]`), NOT yellow highlight
- Mobile: single-column (passage → scroll → question)

### Calendar
- Large cells: no horizontal scroll at 375px
- Completion: filled green circle
- In-progress: animated partial stroke (CSS `stroke-dasharray` animation)
- Future: empty circle with date number

## Information Architecture

### Flashcard Screen
1. The card (full-screen, centered)
2. Progress indicator (subtle top bar — "카드 7/24")
3. Card type label (VOCABULARY / SENTENCE / REVIEW — badge, top-left)
4. Audio button (TTS) — right side of card front
- NOT visible: navigation, session timer, home button

### Conversation Room
1. Current turn (AI bubble or user mic prompt)
2. Turn counter ("턴 3/8+" — subtle, bottom)
3. Mic button (large, centered — primary)
4. Text input fallback (small, below mic — not competing)
- Auto-start: page loads → 2s delay → AI sends greeting (no button press)

### Reading Room
1. Passage (dominant, 60%)
2. Current question (fixed bottom panel on mobile, right panel on tablet+)
3. Question counter ("문제 2/6" → "문제 2/12 (적응형)")
- NOT visible: all questions at once

### Writing Room
1. Task prompt (top, collapsible after first read)
2. Text input (large, dominant)
3. Word count (inline, below textarea, live)
- NOT visible: evaluation criteria until after submission

### Calendar Screen
1. Today's cell (highlighted, primary: "오늘 학습 시작")
2. 20-day grid (done/in-progress/locked/future states)
3. Streak indicator

## Interaction States

| Screen | Loading | Empty | Error | Success | Partial |
|--------|---------|-------|-------|---------|---------|
| Calendar | Skeleton (3 cells) | N/A | "네트워크 오류 → 재시도" | Renders | "패키지 준비 중..." |
| Today's lesson | "준비 중..." spinner | N/A | "생성 실패 — 재시도 + 사유" | Session entry | "생성 중 (12/24)" |
| Flashcard | Image skeleton | Text mnemonic fallback | "이미지 실패 → 텍스트 전환" | Card shown | N/A |
| Conversation | Whisper processing wave | N/A | "STT 실패 → 텍스트 입력" | AI response plays | 5s silence → prompt |
| Reading | Inline spinner for adaptive Q | N/A | "타임아웃 → 프리셋 문제" | Answer submitted | Evidence highlight |
| Writing | "AI 평가 중" | N/A | "평가 실패 → 재시도" | Evaluation shown | N/A |
| Error review | N/A | "오류 없음! 완벽합니다" | N/A | Review complete | N/A |
| Admin | Data skeleton | "데이터 없음" | "API 오류 경고 배너" | Data shown | N/A |

## Session Emotional Arc

| Time | State | Design Note |
|------|-------|-------------|
| 00:00 | Arrival | No choices. One button: "오늘 학습 시작" |
| 00:05 | Flashcards | Progress bar shows completion (not "remaining") |
| ~15min | Conversation | AI greets first. No setup friction. |
| ~30min | Reading | Question counter shows progress |
| ~40min | Writing | Specific prompt, not generic |
| ~50min | Error review | "오늘의 오류 복습" — not "오답" |
| ~52min | Complete | Specific stats ("오늘 배운 단어 12개, 정확도 78%") + tomorrow teaser |
