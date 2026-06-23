<!-- /autoplan restore point: /home/jin/.gstack/projects/english-learning/-autoplan-restore-20260623-054353.md -->
# AI 영어 학습 시스템 — 구현 플랜

SPEC.md 기반 MVP 구현 계획. 20개 수용 기준 전부 통과 목표.

---

## 아키텍처 결정 사항 (구현 전 확정)

### 1. 적응형 문제 생성 파이프라인 재설계

SPEC.md §17 목표 "오답 후 후속 문제 6초 이내"는 3회 순차 LLM 호출로는 불가.

**채택**: 평가 AI가 오답 원인 분류 + 문제 초안을 단일 LLM 호출로 동시 생성. 검증은 "정답이 지문에 존재하는가? 정답이 하나인가?" 두 가지만 경량 체크. 목표: 3-4초.

### 2. 일일 패키지 사전 생성 트리거

**채택**: 사용자가 오늘 세션 완료 시 → 다음날 패키지 생성 큐에 등록. 크론잡(새벽 2시)이 미완성 패키지 재시도. 부분 완성 상태 저장 (`generation_status: pending | partial | ready | failed`).

### 3. AI 역할 분리 방식

**채택 (V1)**: 같은 모델(Claude), 다른 system prompt로 역할 격리. 생성 → 검증 → 평가 프롬프트 독립. V2에서 생성 = Claude, 검증 = GPT-4o로 교차 검증 도입.

### 4. 서비스 워커 범위

**채택**: SW는 정적 에셋(이미지, 오디오 파일, 앱 shell)만 캐시. 일일 패키지 고정은 서버 DB(`daily_lesson` 레코드)가 책임. 새로고침 = API에서 동일 레코드 반환.

---

## 기술 스택

```
Frontend:  Next.js 14 (App Router) + TypeScript
UI:        Tailwind CSS + shadcn/ui
Auth:      NextAuth.js (v5) — GitHub/Google OAuth + 이메일
DB:        PostgreSQL + Prisma ORM
Storage:   Cloudflare R2 (이미지, 오디오)
Queue:     BullMQ + Redis (생성 작업)
Vector:    pgvector (중복 감지용)
STT:       OpenAI Whisper API (주) → Web Speech API (백업)
LLM:       Claude Sonnet 4.6 (생성/검증/평가)
TTS:       OpenAI TTS API (주) → SpeechSynthesis (백업)
Image:     Unsplash/Pexels API (1차) → DALL-E 3 standard fallback (연상 이미지)
Hosting:   Vercel (웹) + Railway (API 서버)
```

---

## 구현 단계

### Phase 1: 기반 (Foundation)

**목표**: 인증, DB 스키마, 빈 API 서버

- [ ] Next.js 프로젝트 초기화 (TypeScript, Tailwind, App Router)
- [ ] PostgreSQL + Prisma 스키마 정의 (Phase 1 객체만)
  - `User`, `UserProfile`, `MonthlyCurriculum`, `DailyLesson`
  - `AIArtifact`, `GenerationJob`
  - `PromptVersion`, `ModelVersion`
- [ ] NextAuth.js 설정 (Google OAuth)
- [ ] 기본 레이아웃 + 로그인/회원가입 화면
- [ ] 레벨 진단 화면 (간단한 설문)
- [ ] 월간 20일 캘린더 화면 (데이터 없어도 렌더링 가능)

**완료 기준**: 로그인 → 캘린더 화면까지 이동 가능

---

### Phase 2: AI Orchestration Service

**목표**: 생성/검증/평가 AI 파이프라인 동작

병렬 진행 가능 (Phase 1과 독립).

- [ ] Prompt 버전 관리 시스템 (`prompt_version` 테이블 + 로더)
- [ ] **VocabularyGenerator**: 단어 카드 12개 생성
  - 단어 정의, 예문, 결합어, 유사 단어 포함
  - 연상법 + 이미지 프롬프트 생성
- [ ] **ValidationAgent** (경량): 단어 카드 검증
  - 정의-예문 일치 여부, 안전성
- [ ] **ImageGenerator**: 연상 이미지 생성 (2단계 파이프라인)
  1. Unsplash/Pexels API로 검색 (연상 키워드 → 영어 검색어 변환)
  2. 검색 결과 없거나 부적합 시 → DALL-E 3 fallback
  - Cloudflare R2 업로드 (검색 이미지도 캐시)
  - 두 단계 모두 실패 시 → 텍스트 연상법 폴백
  - `image_source: unsplash | pexels | dalle | text` 필드로 출처 기록
- [ ] **SentenceCardGenerator**: 문장 카드 4개
- [ ] **ReadingGenerator**: 400-450단어 지문 + 핵심 문제 6개
  - 검증: 답변 가능성, 정답 유일성, 근거 문장 존재
- [ ] **AdaptiveQuestionGenerator**: 후속 문제 (단일 LLM 호출 파이프라인)
- [ ] **SpeakingScenarioGenerator**: 회화 시나리오
  - 카테고리, 역할, 목표, 돌발 변수 포함
- [ ] **WritingGenerator**: 작문 과제
- [ ] **EvaluationAgent**: 회화/작문/읽기 주관식 평가
- [ ] **DailyPlanner**: 위 생성기를 조율하는 오케스트레이터
  - 어제 오류 → 오늘 단어 선택
  - 영역 간 연결 (§14)

---

### Phase 3: 학습 엔진 (Learning Engine)

**목표**: 고정 분량 제어, 복습 큐, 일일 패키지 확정

Phase 1 완료 후 시작.

- [ ] **FixedVolumeControlEngine**
  - 일일 분량 강제 (카드 24개, 읽기 12문제, 회화 8턴+, 작문 1개)
  - 개인 정답률로 분량 증가 차단
- [ ] **LearningScheduleEngine**
  - 일일 패키지 생성 트리거 (세션 완료 시)
  - BullMQ 작업 큐 연동
  - 부분 완성 패키지 재시도 로직
- [ ] **ReviewQueueEngine**
  - SM-2 간격 반복 알고리즘 (또는 단순 고정 간격)
  - 우선순위 5단계 (§7)
  - 동점 처리 규칙
- [ ] 크론잡 (새벽 2시 미완성 패키지 재시도)
- [ ] 일일 패키지 확정 API (`POST /api/lesson/today/freeze`)
- [ ] pgvector 회화 중복 감지 (90일 창)

---

### Phase 4: 핵심 학습 화면

**목표**: 플립카드 → 회화 → 읽기 → 작문 완전 동작

Phase 2 + Phase 3 완료 후 시작.

#### 4a. 플립카드 시스템

- [ ] 단어 플립카드 (카드 6종: 연상 그림, 비슷한 단어, 빈칸, 역방향, 상황 선택, 음성)
- [ ] 문장 암기 플립카드 (암기 모드 6종 중 최소 2종)
- [ ] 카드 평가 UI (모름/어려움/앎/완벽)
- [ ] `FlashcardAttempt` 저장 + ReviewQueue 업데이트
- [ ] 이미지 신고 기능 (§FC-012, §FC-013)

#### 4b. AI 회화실

- [ ] 오디오 녹음 (MediaRecorder API)
- [ ] Whisper STT 연동 → 실패 시 텍스트 입력 전환
- [ ] Claude 회화 턴 처리 (system prompt: 역할 + 오늘 단어 + 교정 규칙)
- [ ] OpenAI TTS → 오디오 재생
- [ ] 5초 침묵 감지 → 부드러운 유도
- [ ] 돌발 변수 삽입 타이밍 관리
- [ ] 8턴 최소 강제 로직
- [ ] 회화 종료 후 주요 오류 최대 5개 교정 + 재수행
- [ ] `ConversationTurn`, `SpeakingEvaluation` 저장

#### 4c. 적응형 읽기실

- [ ] 지문 렌더링 + 핵심 문제 6개 순차 제시
- [ ] 정답/오답 판정
- [ ] 적응형 후속 문제 실시간 생성 (3-4초 목표)
- [ ] 주관식 답안 이중 평가 + 불일치 시 대체 객관식
- [ ] 근거 문장 하이라이트
- [ ] `ReadingAttempt`, `RemediationChain` 저장

#### 4d. 작문실

- [ ] 작문 과제 제시 + 답변 입력
- [ ] AI 평가 (문법, 자연스러움, 논리, 과업 달성)
- [ ] 교정 + 재작성 지침 표시
- [ ] 1회 수정 강제
- [ ] `WritingSubmission`, `WritingRevision` 저장

#### 4e. 오류 복습

- [ ] 오류 노트 화면
- [ ] 오늘의 오류 5개 복습 (ReviewQueue에서)
- [ ] `ErrorRecord` 저장

---

### Phase 5: 진도 관리 + PWA

**목표**: 주간/월말 평가, PWA 기능, 관리자 화면

- [ ] 오늘의 학습 대시보드 (완료율, 영역별 진행 상황)
- [ ] 성장 리포트 (first-attempt accuracy vs mastery accuracy)
- [ ] 주간 평가 (`WeeklyAssessment`)
- [ ] 월말 시험 + 진급 판정 (`MonthlyExam`, `ProgressionDecision`)
- [ ] PWA 설정 (manifest.json, service worker)
  - SW 캐시 범위: 이미지, 오디오, 앱 shell (동적 데이터 제외)
- [ ] 알림 기능 (오늘 학습 미완료 시)
- [ ] **관리자 화면** (10개 화면 §15)
  - AI 프롬프트 버전 관리
  - 생성 콘텐츠 검사 기록
  - 신고 처리
  - 비용/처리 시간 대시보드

---

### Phase 6: 개인정보 + 접근성 + 성능

**목표**: MVP 수용 기준 20개 전부 통과

- [ ] 음성 데이터 기본 미저장 (동의 시만)
- [ ] 전사문/작문 기록 삭제 기능
- [ ] 계정 삭제 시 학습 데이터 삭제
- [ ] 모든 이미지 alt 텍스트 (§FC-003, §FC-005)
- [ ] 키보드 전용 조작 (카드 뒤집기, 읽기 문제)
- [ ] 색상 외 정오답 구분 (아이콘/텍스트 병행)
- [ ] 음성 없이 전체 학습 완료 가능 (§MVP-20)
- [ ] 성능 최적화
  - 페이지 렌더링 2.5초 이내
  - AI 텍스트 생성 P95 6초 이내
  - 이미지 지연 로딩

---

## 병렬 실행 전략

```
Week 1-2:  [Phase 1] + [Phase 2] 병렬
Week 2-3:  [Phase 3] (Phase 1 완료 후)
Week 3-5:  [Phase 4a/4b/4c] 병렬 (Phase 2+3 완료 후)
           [Phase 4d/4e] 이후 순차
Week 5-7:  [Phase 5] + [Phase 6]
```

---

## 미해결 결정 사항 (구현 전 확정 필요)

1. **복습 큐 알고리즘**: SM-2 vs 단순 고정 간격(1/3/7/14일)?
2. **주관식 평가 모델**: Claude 단일 vs Claude + GPT-4o 교차?
3. **이미지 전략 확정**: Unsplash/Pexels 우선 → DALL-E 3 fallback ✅
4. **회화 중복 감지**: pgvector 코사인 유사도 임계값?
5. **인증 방식**: 개발자 본인 20일 테스트 시 OAuth 필요한가, 아니면 단순 이메일/비번?

---

## 성능 목표 (SPEC.md §17)

| 기능 | 목표 | 파이프라인 설계 |
|------|------|----------------|
| 일반 화면 | ≤2.5초 | SSR + 이미지 사전 캐시 |
| AI 텍스트 생성 P95 | ≤6초 | 스트리밍 응답 |
| 적응형 후속 문제 | ≤6초 | 단일 LLM 호출 (평가+생성 합산) |
| 회화 AI 응답 | ≤8초 | Whisper(2초) + Claude(3초) + TTS(1초) |
| 음성 전사 | ≤5초 | Whisper API |
| 연상 이미지 | 세션 시작 전 | 전날 사전 생성 |

---

## 데이터 모델 핵심 설계 원칙

1. `DailyLesson`은 순수 집합자 — 각 컴포넌트(`VocabularyCard`, `ReadingPassage` 등)가 독립적으로 `generation_status` 보유
2. `AIArtifact.artifact_id`는 패키지 확정 후 불변 — 새로고침/기기 전환에도 동일 ID 반환
3. First-attempt accuracy와 Mastery accuracy는 별도 컬럼 — 후속 문제 정답이 최초 오답을 덮어쓰지 않음 (§12)
4. 모든 AI 생성 결과에 `model_version` + `prompt_version` 기록 (§4.4)

---

## /autoplan Design Review — Phase 2

*Generated 2026-06-23 by /autoplan (SELECTIVE EXPANSION mode)*
*gstack designer not available — text-only review*

### Step 0A: Design Completeness Rating

**Overall design rating: 3/10**

The plan describes what each screen DOES but never specifies what the user SEES. No design system (no colors, no type scale, no spacing), no interaction states, no emotional arc, no mobile intent. A 10/10 would have: named component library usage, complete interaction state maps, specified empty states for every screen, mobile breakpoint behavior, and an emotional journey storyboard.

### Step 0B: Design System Status

No DESIGN.md exists. **Reference: design doc `jin-unknown-design-20260623-044553-ko.md` (approved in /office-hours).** That doc contains critical UX decisions that PLAN.md does not reflect. Design review calibrates against that doc as the interim design system.

### Step 0C: Existing Design Leverage

Tech stack: `Tailwind CSS + shadcn/ui`. This is a strong baseline — shadcn/ui provides accessible, composable primitives. The review assumes shadcn/ui component naming (`Card`, `Button`, `Dialog`, `Textarea`, `Progress`, `Badge`, `Separator`) as the design vocabulary.

---

### Dimension 1: Information Architecture — 4/10

**Gap:** The plan lists screens but never defines hierarchy within them. What does the user see first when they open the flashcard screen? When they open the conversation room? The "first, second, third" question is unanswered for every screen.

**Auto-decided: Add IA spec for each Phase 4 screen.**

```
INFORMATION ARCHITECTURE — PHASE 4 SCREENS
═══════════════════════════════════════════════════════════════
FLASHCARD SCREEN (Phase 4a)
  Priority 1: The card itself (full-screen, centered)
  Priority 2: Progress indicator (subtle, top bar — "카드 7/24")
  Priority 3: Card type label (VOCABULARY / SENTENCE / REVIEW — badge, top-left)
  Priority 4: Audio button (TTS pronunciation) — right side of card front
  NOT visible: Navigation, session timer, home button (subtraction default)

CONVERSATION ROOM (Phase 4b)
  Priority 1: Current turn (AI bubble or user mic prompt)
  Priority 2: Turn counter ("턴 3/8+" — subtle, bottom status)
  Priority 3: Mic button (large, centered — primary action)
  Priority 4: Text input fallback (small, below mic — not competing)
  NOT visible: Topic description, previous scenario (focus on NOW)
  Auto-start sequence: page loads → 2s delay → AI sends greeting (no button press)

READING ROOM (Phase 4c)
  Priority 1: Passage (reading zone, dominant area)
  Priority 2: Current question (fixed bottom panel, slides up)
  Priority 3: Question counter ("문제 2/6" → "문제 2/12 (적응형)")
  NOT visible: All questions at once (one at a time, prevents skipping)

WRITING ROOM (Phase 4d)
  Priority 1: Task prompt (top, collapsible after reading)
  Priority 2: Text input area (large, dominant)
  Priority 3: Word count (inline, below textarea, live update)
  NOT visible: Evaluation criteria (revealed only after submission)

CALENDAR SCREEN (Phase 1)
  Priority 1: Today's cell (highlighted, primary action = "오늘 학습 시작")
  Priority 2: 20-day grid with completion states (done/in-progress/locked/future)
  Priority 3: Streak indicator (visual motivation)
  NOT visible: Settings, profile, admin links (separate navigation)
═══════════════════════════════════════════════════════════════
```

---

### Dimension 2: Interaction State Coverage — 2/10

**Gap:** No interaction state is specified anywhere in the plan. This is the most critical design gap — every missing state becomes a 500 error page or blank screen in production.

**Auto-decided: Add complete interaction state map to Phase 4 spec.**

```
INTERACTION STATE COVERAGE MAP
═══════════════════════════════════════════════════════════════
  SCREEN               | LOADING     | EMPTY       | ERROR          | SUCCESS     | PARTIAL
  ────────────────────────────────────────────────────────────────────────────────────────
  Calendar view        | 스켈레톤     | N/A (always | 네트워크 오류   | 캘린더 렌더  | 패키지
                       | (3 cells)   | has 20 days)| → 재시도 버튼   | 완료         | 준비 중...
  ────────────────────────────────────────────────────────────────────────────────────────
  Today's lesson entry | "준비 중..."  | N/A          | "생성 실패 —   | 세션 진입    | "생성 중
                       | 스피너       |              | 재시도" + 사유  |              | (12/24)"
  ────────────────────────────────────────────────────────────────────────────────────────
  Flashcard (front)    | 이미지 로딩  | 텍스트 연상법 | 이미지 실패     | 카드 표시    | N/A
                       | 스켈레톤     | 폴백 (자동)  | → 텍스트 전환   |              |
  ────────────────────────────────────────────────────────────────────────────────────────
  Conversation (mic)   | Whisper 처리 | N/A          | STT 실패       | AI 응답 재생  | 5초 침묵
                       | 웨이브 애니  |              | → 텍스트 입력   |              | → 유도 메시지
  ────────────────────────────────────────────────────────────────────────────────────────
  Reading (question)   | 적응형 생성   | N/A          | 적응형 타임아웃 | 답안 제출    | 근거 문장
                       | 인라인 스피너 |              | → 프리셋 문제   |              | 하이라이트
  ────────────────────────────────────────────────────────────────────────────────────────
  Writing (submit)     | 평가 중      | N/A          | 평가 실패      | 평가 표시    | N/A
                       | "AI 평가 중"  |              | → 재시도        |              |
  ────────────────────────────────────────────────────────────────────────────────────────
  Error review         | N/A          | "오류 없음!  | N/A            | 복습 완료    | N/A
                       |              | 완벽합니다"  |                |              |
  ────────────────────────────────────────────────────────────────────────────────────────
  Admin dashboard      | 데이터 로딩  | "데이터 없음" | API 오류       | 데이터 표시  | N/A
                       | 스켈레톤     |              | 경고 배너       |              |
═══════════════════════════════════════════════════════════════
```

---

### Dimension 3: User Journey / Emotional Arc — 5/10

**Gap:** The plan describes features, not feelings. A Korean researcher opening this app has ANXIETY (am I doing this right?), RESISTANCE (50 minutes is a lot), and HOPE (I want this to work). The design must address all three.

**From design doc §감정 여정:**
> 도착 → 인지 부담 없이 시작 → 흥미 → 집중 → 성취감 → 내일 동기 부여

**Auto-decided: Add emotional design notes to Phase 4 spec.**

```
EMOTIONAL ARC — SESSION FLOW
  00:00 (arrival)  → No choices. Today's session starts automatically.
                     Calendar shows one button: "오늘 학습 시작"
  00:05 (entry)    → Flashcards begin immediately. 24 cards, not "24 cards remaining."
                     Progress bar shows completion, not remaining.
  ~15min (midpoint)→ Conversation room opens. AI greets first. No setup friction.
  ~30min           → Reading room. Question counter shows progress.
  ~40min           → Writing room. Prompt is specific, not generic.
  ~50min           → Error review. Final 5 items. "오늘의 오류 복습" — not "오답."
  ~52min (complete)→ Session complete screen: specific stats ("오늘 배운 단어 12개, 
                     정확도 78%") + tomorrow teaser ("내일: 여행 영어 실전").
                     NOT generic "Good job!" — specific to what they did today.
```

---

### Dimension 4: AI Slop Risk — HIGH ⚠️

**Risk:** The plan uses shadcn/ui + Tailwind with no visual constraints. This is the exact recipe for generic card-grid AI-generated UI.

**Specific risks:**
- Flashcard: could look like a generic white card on white background
- Conversation: could look like a generic chat bubble interface (WhatsApp clone)
- Reading: could look like a wall of text with basic form inputs for questions
- Dashboard: could look like every other SaaS dashboard (side nav, metrics cards, charts)

**Auto-decided: Add anti-slop visual constraints to Phase 4 spec.**

```
ANTI-SLOP VISUAL CONSTRAINTS (required in implementation)
  ─────────────────────────────────────────────────────────
  Flashcard:    Full-screen card (not a card inside a page). 
                Card occupies 100% viewport height.
                Flip is a CSS 3D transform (rotateY), not a slide.
                Image takes ≥60% of card front. Word is overlaid, not below.
                
  Conversation: NOT chat bubbles. Use a waveform visualization for speaking state.
                AI text appears in a clean, single-column display (not a bubble).
                Mic button is the only interactive element visible while speaking.
                5-second silence indicator: subtle pulsing ring around mic, not text.
                
  Reading:      Two-panel layout: passage (60%) + question (40%).
                Passage scrolls independently. Question panel is sticky.
                When highlight mechanic activates: glow effect on evidence sentence,
                not a yellow highlight (yellow highlight = grade school).
                
  Calendar:     Large calendar cells. Completion state = filled circle (green).
                In-progress = partially filled (animated stroke).
                Future = empty circle with date number.
                NO side navigation. Calendar IS the main screen.
                
  General:      Typography: Inter (already in most Next.js setups) at 16px base.
                Spacing scale: 4px base (Tailwind defaults are fine).
                Color: monochromatic dark background for learning screens
                (reading/writing); bright white for flashcards. Not a single theme.
```

---

### Dimension 5: Design System Alignment — 0/10 (No DESIGN.md)

**Gap:** No DESIGN.md. This is the most fundamental design gap for a project of this complexity.

**Auto-decided:** Create `DESIGN.md` stub in Phase 1 with:
- Color palette (2 themes: flashcard mode = bright, learning mode = dark/focused)
- Typography (Inter, 3 sizes: display/body/caption)
- Component naming conventions (shadcn/ui aliases)
- Animation timing (card flip: 300ms, page transitions: 200ms)
- Responsive breakpoints (mobile-first: 375px / 768px / 1024px)

This stub should be created in Phase 1 BEFORE any screen implementation in Phase 4.

---

### Dimension 6: Responsive Design — 2/10

**Gap:** Mobile is mentioned only in Phase 6 as an optimization. This is a PWA — mobile is the primary target, not an afterthought.

**Key mobile-specific behaviors not in plan:**
- Flashcard: swipe left/right to rate (not tapping buttons). No swipe spec anywhere.
- Conversation mic button: must be ≥44px touch target (not specified)
- Reading room two-panel layout: collapses to single-column on mobile (passage → scroll → question)
- Calendar: 20-day grid at 375px without horizontal scroll?

**Auto-decided: Move mobile-first layout spec to Phase 4 (not Phase 6). Add swipe gesture to flashcard spec.**

```
MOBILE BREAKPOINTS (required in Phase 4 implementation):
  375px (iPhone SE): Primary target. All interactions work thumb-only.
  768px (tablet):    Two-panel reading layout available.
  1024px (desktop):  Full layout. Admin dashboard primary.
  
SWIPE GESTURES (Phase 4a addition):
  Swipe right → "완벽" (easiest rating)
  Swipe left  → "모름" (hardest rating)
  Swipe up    → "앎" (middle rating)
  Tap center  → Flip card (reveal answer)
```

---

### Dimension 7: Accessibility Baseline — 3/10

**Gap:** Phase 6 mentions keyboard nav, alt text, and color-independent feedback. But accessibility must be built in from Phase 1, not retrofitted in Phase 6.

**Specific gaps by phase:**
- Phase 4a (flashcards): Space bar = flip; arrow keys = rate; no mouse required
- Phase 4b (conversation): Tab to text input when mic fails; Enter to submit
- Phase 4c (reading): Tab through questions; evidence highlight must have text label too
- Phase 4d (writing): Standard textarea; no custom keyboard required
- All images: alt text required (SPEC.md MVP criterion). Plan mentions it; Phase must enforce it.

**Auto-decided: Add keyboard interaction spec to each Phase 4 sub-section. Move "음성 없이 완료 가능" (MVP-20) from Phase 6 to a Phase 4 contract (text fallback is a Phase 4b requirement, not a Phase 6 nice-to-have).**

---

### Design Review Audit Trail (additions to Decision Audit Trail)

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|---------|
| 11 | Design | Full-screen card layout (no page chrome during session) | Mechanical | P5 (explicit) | Subtraction default; design doc §AI 자동 시작; session focus | Standard card-inside-page |
| 12 | Design | Auto-start conversation (2s delay, no button) | Mechanical | P1 (completeness) | Design doc §세션 시작 방식 is explicit; must be in Phase 4b spec | Button-initiated session |
| 13 | Design | Swipe gestures for flashcard rating | Selective expansion | P2 (momentum) | Mobile-primary PWA; thumb-only requirement | Button-only (desktop-first) |
| 14 | Design | Dual-theme (flashcard mode bright / learning mode dark) | Taste decision | P4 (specificity) | Cognitive contrast: focus mode = dark reduces distraction | Single theme throughout |
| 15 | Design | DESIGN.md stub in Phase 1 | Mechanical | P1 (completeness) | No design system = implementation drift across 4 developers (or 4 sessions) | Defer design system to after MVP |
| 16 | Design | Move mobile-first spec to Phase 4 (not Phase 6) | Mechanical | P3 (fail-fast) | PWA retrofit is expensive; mobile-first from start is easier | Retrofit in Phase 6 |
| 17 | Design | Move MVP-20 text fallback to Phase 4b contract | Mechanical | P3 (fail-fast) | Text fallback is an architectural constraint on Phase 4b; retrofitting breaks UX flow | Add in Phase 6 accessibility pass |

**Taste decision flagged for final gate:** Decision #14 (dual-theme bright/dark). One theme is simpler to implement and maintain; dual themes add complexity. But the design doc implies a focused-mode aesthetic for learning screens. Surfacing at Phase 4 final gate.

### Design Review Summary

| Dimension | Rating | Critical Gaps |
|-----------|--------|---------------|
| Information Architecture | 4/10 → +spec added | Priority hierarchy undefined for all screens |
| Interaction States | 2/10 → +map added | Every state was missing |
| Emotional Arc | 5/10 → +notes added | Generic success screens; no session completion moment |
| AI Slop Risk | HIGH → +constraints added | shadcn/ui + Tailwind without visual constraints = generic |
| Design System | 0/10 → +DESIGN.md task added to Phase 1 | No design system at all |
| Responsive | 2/10 → +mobile spec moved to Phase 4 | Mobile afterthought in Phase 6 |
| Accessibility | 3/10 → +keyboard specs added | Retrofit in Phase 6 is too late |

## /autoplan CEO Review — Phase 1

*Generated 2026-06-23 by /autoplan (SELECTIVE EXPANSION mode)*

### Step 0A: Premise Challenge

| # | Premise | Status | Evidence |
|---|---------|--------|----------|
| 1 | Korean researchers have activation gap, not knowledge gap | VALID | Developer's direct observation; design doc §문제정의 |
| 2 | 50-minute daily sessions sustainable for busy researchers | UNVALIDATED | Design doc acknowledges 50-min as "absolute upper bound"; no empirical test yet |
| 3 | AI conversation can replace human tutors effectively | REASONABLE HYPOTHESIS | Well-evidenced in L2 literature; but academic-domain-specific scenarios untested |
| 4 | Vocabulary embedded in conversation transfers better than isolated study | STATED AS HYPOTHESIS | Design doc §전제조건5: "연상 기억법은 가설이지 사실이 아니다" |
| **5** | **PLAN.md scope is appropriate for V1 (20-day solo self-test)** | **⚠️ CRITICAL: WRONG** | Both models confirm PLAN.md builds production SaaS (7+ weeks); design doc chose Approach C (3-4 weeks, IndexedDB, local) |

### Step 0C: Dream State Delta

```
CURRENT STATE               THIS PLAN (as written)        12-MONTH IDEAL
──────────────────────────  ──────────────────────────    ──────────────────────────
Jin uses ChatGPT manually   6-phase full SaaS system:     Validated local prototype
with a typed prompt,        PostgreSQL + BullMQ +         (20-day self-test done);
occasionally, no memory     Redis + R2 + pgvector +       expanded to lab students;
between sessions            NextAuth + Vercel + Railway   data on retention + completion
                            + admin dashboard + PWA       before investing in infra
                            (7+ weeks to first session)   (infra comes AFTER validation)
```

### Step 0C-bis: Implementation Alternatives

```
APPROACH A: Minimal Voice Tutor (design doc §A)
  Summary: Browser STT/TTS, Claude API, no persistence
  Effort:  S (human: ~10 days / CC: ~3 days)
  Risk:    Low (can fail fast) | High (no memory = no learning trajectory)
  Pros:    Fastest to first session; validates AI conversation loop
  Cons:    No cross-session memory; can't test the 20-day arc
  Reuses:  N/A (greenfield)

APPROACH B: Conversation-Embedded Curriculum — design doc CHOSE THIS (Approach C)
  Summary: IndexedDB for session logs, Whisper+Claude+TTS, vocabulary in conversation,
           reading + speaking practice. No server DB, no deployment needed for V1.
  Effort:  M (human: ~21 days / CC: ~7 days)
  Risk:    Medium (more moving parts than A, but all local)
  Pros:    Tests full core hypothesis; cross-session memory via IndexedDB;
           validates before infrastructure investment
  Cons:    No cross-device sync (acceptable for solo 20-day test on one machine)
  Reuses:  N/A (greenfield)

APPROACH C: PLAN.md As Written (full production SaaS)
  Summary: PostgreSQL + BullMQ + Redis + R2 + NextAuth + Vercel + Railway +
           admin dashboard + PWA + pgvector. 6 phases, 7+ weeks.
  Effort:  XL (human: ~7 weeks / CC: ~3 weeks)
  Risk:    High (spends 7 weeks before first real learning session)
  Pros:    Production-ready; handles V2 (multi-user students) from day 1
  Cons:    Validates loop too late; if 50-min sessions prove unsustainable,
           you've spent 7 weeks on infrastructure for a product you'll redesign
  Reuses:  N/A (greenfield)

RECOMMENDATION: Approach B (design doc's Approach C) — matches the design doc's
explicit decision, achieves the 20-day self-test goal, and defers infrastructure
investment until the core loop is validated.
```

### CEO Dual Voices

**CLAUDE SUBAGENT (CEO — strategic independence):**
> "Critical finding: PLAN.md ignores the design doc's explicit gate — 'do the 3-day ChatGPT test first; if you come back, build C.' PLAN.md builds Approach B (6-8 weeks) disguised as Approach C. The 6-month regret: spending 6 weeks on PostgreSQL + BullMQ + admin dashboard and discovering the 50-minute session is too long to sustain on day 8."
> Severity: CRITICAL

**CODEX (CEO — adversarial):**
> "PLAN.md does not match a 20-day solo self-test. It builds a production SaaS. The #1 risky premise: that the hard problem is infrastructure, not learning behavior. One-sentence fix: Rewrite as a 3-4 week local IndexedDB prototype with no auth, no server DB, no queues, no admin — only the minimum AI loop for 20 daily sessions."
> Severity: CRITICAL

### CEO Dual Voices — Consensus Table

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   ❌P5    ❌P5   DISAGREE (P5 is wrong)
  2. Right problem to solve?           ✅      ✅     CONFIRMED
  3. Scope calibration correct?        ❌      ❌     CONFIRMED (over-scoped)
  4. Alternatives sufficiently explored?❌     ❌     CONFIRMED (design doc approach ignored)
  5. Competitive/market risks covered? ✅      ✅     CONFIRMED (not the main risk)
  6. 6-month trajectory sound?         ❌      ❌     CONFIRMED (regret scenario identified)
═══════════════════════════════════════════════════════════════
4/6 CONFIRMED. 1 DISAGREE (Premise 5 — both models say it's wrong, user must decide).
⚠️ USER CHALLENGE: Both models agree PLAN.md scope should change.
```

### Step 0E: Temporal Interrogation

```
HOUR 1 (foundations):   V1 architecture decision MUST be made before writing ANY code.
                        PostgreSQL vs IndexedDB: this determines the entire Phase 1.
                        Currently: PLAN.md chose PostgreSQL. Design doc chose IndexedDB.

HOUR 2-3 (core logic): AI prompt design for conversation scenarios (§대화 모듈 시스템 프롬프트)
                        is not in PLAN.md. The system prompts are in the design doc but
                        not in the implementation plan. Implementer will have to invent them.

HOUR 4-5 (integration): Phase 4 (actual learning screens) is BLOCKED until
                        Phase 2 (10 generators) AND Phase 3 (3 engines) both complete.
                        This is a 5-week blocking dependency before jin can run session 1.

HOUR 6+ (polish/tests): 5 unresolved decisions at bottom of PLAN.md
                        (SM-2 vs fixed interval, single vs cross-model eval, 
                        pgvector threshold, auth approach) — all must resolve before Phase 3.
```

### Mode Selection (auto-decided): SELECTIVE EXPANSION
*Rationale: New product, validation phase. Scope baseline = design doc's Approach C. Surface expansions as individual opt-ins after the core architecture decision is resolved.*

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|---------|
| 1 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | P1 (completeness) | New product pre-validation stage | EXPANSION (premature), REDUCTION (loses core hypothesis), HOLD SCOPE (scope itself is wrong) |
| 2 | CEO | Premise gate: keep PLAN.md full production scope | User decision | User authority | User explicitly chose B (full system) over design doc's Approach C | Rebuild to IndexedDB/local |
| 3 | CEO | Add BaseGenerator interface for 10 generators in Phase 2 | Mechanical | P4 (DRY) | All generators share generate→validate→store pattern; extract common interface | N/A |
| 4 | CEO | Add cron failure alert to Phase 3 spec | Mechanical | P1 (completeness) | Silent cron failure = learner opens app with no content; must alert | Defer to Phase 5 |
| 5 | CEO | Add auto-start UX behavior to Phase 4b spec | Mechanical | P1 (completeness) | Design doc §세션 시작 방식 describes "2초 후 자동 인사 시작, 메뉴 없음" — not in PLAN.md | N/A |
| 6 | CEO | Add pgvector setup to Phase 1 (infra) | Mechanical | P1 (completeness) | pgvector is a PostgreSQL extension; must be enabled in Railway + local dev before Phase 3 | Defer to Phase 3 |
| 7 | CEO | Resolve 5 unresolved decisions before Phase 2 coding | Mechanical | P5 (explicit) | SM-2 algorithm choice affects ReviewQueueEngine data model; eval model affects ValidationAgent API design | Leave unresolved |
| 8 | CEO | Add LLM error handling spec to Phase 2 | Mechanical | P1 (completeness) | 10 generators make LLM calls; no error handling for malformed JSON, hallucinated content, rate limits | N/A |
| 9 | CEO | Add streaming spec to Phase 2 generators | Mechanical | P5 (explicit) | "AI 텍스트 생성 P95 ≤6초" requires streaming; plan mentions it but doesn't specify which generators | N/A |
| 10 | CEO | Partial lesson state handling in Phase 3 | Mechanical | P1 (completeness) | generation_status: partial exists but learner UX for partial package not specified | N/A |

### Section 1: Architecture Review

```
SYSTEM ARCHITECTURE (as planned)
═══════════════════════════════════════════════════════════════
  Browser (Next.js 14, App Router, TypeScript, Tailwind)
      │
      ├── STT: MediaRecorder → Whisper API (主) → Web Speech API (副)
      ├── TTS: OpenAI TTS API (主) → SpeechSynthesis (副)
      │
      ▼
  Vercel (Frontend + API Routes / NextAuth)
      │
      ▼
  Railway (API Server)
      │
      ├── PostgreSQL + Prisma ──── pgvector (duplicate detection)
      ├── Redis + BullMQ (generation job queue)
      ├── Cron Job (2am — retry partial packages)
      │
      ▼
  AI Orchestration Service
      ├── DailyPlanner (orchestrator)
      ├── VocabularyGenerator → ValidationAgent → ImageGenerator
      ├── SentenceCardGenerator → ValidationAgent
      ├── ReadingGenerator → ValidationAgent
      ├── AdaptiveQuestionGenerator
      ├── SpeakingScenarioGenerator
      ├── WritingGenerator
      └── EvaluationAgent (conversation / writing / reading)
      │
      ▼
  Cloudflare R2 (images, audio)
═══════════════════════════════════════════════════════════════

DEPENDENCY CHAIN (critical path):
  Phase 1 (foundation) ──▶ Phase 3 (learning engine)
  Phase 2 (AI generators) ────────────────────────────▶ Phase 4 (learning screens)
  Phase 3 ──────────────────────────────────────────────▶ Phase 4
  
  ⚠️ Phase 4 is BLOCKED until BOTH Phase 2 AND Phase 3 complete.
     Week 1-5 produces zero learner-visible features.
     First learnable session: Week 5 (earliest).
```

**Auto-decided: No architectural changes. Structure is sound. Flagging the 5-week blocking dependency as a risk to monitor; suggest dogfooding Phase 4b (conversation only) as a parallel track in Week 3 to get early feedback.**

### Section 2: Error & Rescue Map

```
PHASE 2 — AI GENERATOR ERROR PATHS (currently unspecified in plan)
═════════════════════════════════════════════════════════════
  Generator call          | What can fail          | Rescue needed
  ────────────────────────|────────────────────────|──────────────────────
  LLM API call            | Timeout (>30s)         | Retry 2x, then fail job
  LLM API call            | Rate limit (429)       | Exponential backoff
  LLM API call            | Malformed JSON         | Log + fail job (no silent swallow)
  LLM API call            | Hallucinated content   | ValidationAgent catches; retry 1x
  LLM API call            | Model refusal          | Log + fallback prompt
  ValidationAgent         | All 3 retries fail     | Mark artifact as failed; exclude from package
  ImageGenerator (step 1) | Unsplash/Pexels miss   | Fall through to DALL-E 3
  ImageGenerator (step 2) | DALL-E 3 fails         | Fall through to text mnemonic
  R2 upload               | Network failure        | Retry 3x; if all fail, use text fallback
  Cron job (2am)          | Package generation fails| Alert developer; retry next cron run
═════════════════════════════════════════════════════════════
```

**Auto-decided: Add error handling table above to Phase 2 spec as a required implementation guide. Each generator must implement the retry/fallback chain before going to production.**

### Section 3: Security & Threat Model

| Threat | Likelihood | Impact | Mitigated? |
|--------|-----------|--------|------------|
| LLM prompt injection via user conversation input | Medium | Medium | ❌ Not specified — add input sanitization before passing to conversation LLM |
| Direct object reference (user A accesses user B's lesson) | Low (OAuth scoped) | High | ✅ Prisma query should always include `user_id` filter |
| Cloudflare R2 image exposure (public vs signed URLs) | Medium | Low | ❌ Plan doesn't specify — use signed URLs for all R2 objects |
| BullMQ job data exposure (job contains user data) | Low | Medium | ✅ Redis on private Railway network |
| Speech audio data retention (GDPR/privacy) | High for students | High | ✅ Phase 6: audio not stored by default, consent-gated |
| NextAuth session hijacking | Low | High | ✅ NextAuth v5 handles; use httpOnly + secure cookies |

**Auto-decided: Add prompt injection note to Phase 2 conversation implementation spec. Add R2 signed URL requirement to Phase 2 ImageGenerator spec.**

### Section 4: Data Flow & Edge Cases

```
KEY DATA FLOW: Daily Package Generation
INPUT ──▶ DailyPlanner ──▶ [10 generators in parallel/sequential]
  │              │                    │
  ▼              ▼                    ▼
user_id      yesterday's          generation_status:
             errors →              pending → partial → ready
             today's word          or failed
             selection

EDGE CASES:
┌────────────────────────────────────────────────────────────────┐
│ Learner UX during partial package (generation in progress)     │
│ Plan specifies: generation_status: pending|partial|ready|failed│
│ ❌ MISSING: what does the learner SEE when status=partial?      │
│    Fix: Show "세션 준비 중..." loading screen; auto-refresh     │
│         every 10s; if ready → enter session; if failed → retry │
│         button + "내일 다시 시도하세요" fallback                │
├────────────────────────────────────────────────────────────────┤
│ Conversation turn: user navigates away mid-session             │
│ ❌ MISSING: is session resumable? Design doc says yes.          │
│    Fix: Plan §서비스 워커 says server DB fixes this (correct),  │
│         but Phase 4b implementation must detect in-progress    │
│         session and resume from last ConversationTurn          │
├────────────────────────────────────────────────────────────────┤
│ Adaptive question generation timeout (>6s)                     │
│ ❌ MISSING: timeout fallback not specified                       │
│    Fix: Fallback to pre-generated question set if              │
│         AdaptiveQuestionGenerator exceeds 8s                   │
└────────────────────────────────────────────────────────────────┘
```

**Auto-decided: Add partial package UX, session resume, and adaptive question timeout fallback to Phase 4 spec.**

### Section 5: Code Quality

No code exists yet. Pre-implementation review: flag patterns to avoid.

**Pattern risk: 10 generators with identical structure.** All Phase 2 generators follow: receive context → call LLM → validate → store artifact. Without a base class/interface, this becomes 10 similar implementations with subtle differences. Recommend: define a `BaseGenerator` interface in Phase 2 with `generate(context): AIArtifact` and `validate(artifact): ValidationResult` as required methods.

**Pattern risk: Prompt versioning.** PLAN.md mentions `PromptVersion` table + loader but doesn't specify how prompts are loaded at runtime. Hardcoded strings in generator classes vs database-loaded vs file-system loaded. This decision must be made in Phase 2 before any generator is written.

**Auto-decided: Add BaseGenerator interface + PromptLoader pattern to Phase 2 spec.**

### Section 6: Test Review

```
NEW UX FLOWS (Phase 4):
  ├── 플립카드 세션 (24 cards/day: vocabulary + sentence + review)
  ├── AI 회화실 (8+ turns, STT → LLM → TTS)
  ├── 적응형 읽기실 (6 core + 6 adaptive questions)
  ├── 작문실 (submit + AI evaluation + 1 revision)
  └── 오류 복습 (5 items from ReviewQueue)

NEW DATA FLOWS:
  ├── Daily package generation (DailyPlanner → 10 generators → DB)
  ├── Conversation turn (audio → Whisper → LLM → TTS → audio)
  ├── Adaptive question (ReadingAttempt → AdaptiveQuestionGenerator → question)
  └── Error tracking (wrong answer → ErrorRecord → ReviewQueue priority bump)

LLM EVAL REQUIREMENTS:
  ├── VocabularyGenerator: does output include definition, example, collocations?
  ├── ValidationAgent: does it catch malformed/incorrect vocabulary cards?
  ├── EvaluationAgent: does conversation evaluation correctly classify error types?
  └── AdaptiveQuestionGenerator: is follow-up question harder (correct) or targeted (incorrect)?

MISSING FROM PLAN: No test plan at all.
```

**Auto-decided: Add test plan skeleton to PLAN.md. Minimum required: unit tests for each generator (mock LLM), integration test for full daily package generation, E2E test for complete learner session, LLM eval suite for generator quality.**

### Section 7: Performance Review

| Codepath | Target | Risk | Mitigation |
|----------|--------|------|------------|
| AI text generation | P95 ≤6s | High — 10 generators, some sequential | Pre-generate at night; stream real-time generators |
| Adaptive follow-up question | ≤6s | High — single LLM call at evaluation time | Combined evaluate+generate in single call (PLAN.md §아키텍처 결정 1 — good) |
| Conversation AI response | ≤8s | Medium — Whisper(2s)+LLM(3s)+TTS(1s) | Pipeline already designed correctly |
| Image pre-generation | Before session | Medium — Unsplash→DALL-E→R2 can be slow | Pre-generate at cron time; fallback to text if R2 upload fails |
| pgvector duplicate check | Not specified | Low — similarity search on 90-day window | Add index on embedding column in Phase 3 |

**DB indexes needed (not in plan): `daily_lesson(user_id, study_day)`, `flashcard_attempt(daily_lesson_id, card_type)`, `review_queue(user_id, next_review_date, priority)`, `conversation_turn(speaking_evaluation_id)`, vector index on similarity embedding column.**

**Auto-decided: Add DB index list to Phase 3 spec.**

### Section 8: Observability & Debuggability

**Missing from plan:**
- Alert: cron job failure at 2am → developer notification (email/Slack)
- Metrics: per-generator latency (which generator is the bottleneck?)
- Metrics: daily active sessions, completion rate per module (reading/conversation/writing)
- Dashboard: Railway provides basic metrics; add Vercel Analytics for frontend

**Phase 5 admin dashboard (§15) covers:**
- AI prompt version management ✅
- Generation content inspection log ✅
- Report handling ✅
- Cost/processing time dashboard ✅

**Gap:** Cost/processing time dashboard helps but doesn't alert on failures. Add cron failure notification before Phase 3 cron job ships.

**Auto-decided: Add failure alert requirement to Phase 3 cron job spec.**

### Section 9: Deployment & Rollout

**Greenfield project — no migration rollback risk for Phase 1.** New DB from scratch.

**Phase ordering risk:** pgvector extension must be enabled in PostgreSQL BEFORE Phase 3 tries to create the vector index. The plan puts pgvector in Phase 3, but Railway PostgreSQL requires enabling it at the database level. Must add to Phase 1 (database setup).

**No feature flags planned.** For a solo developer, this is acceptable. Note: if students are added in V2, feature flags become important.

**Post-deploy verification (Phase 1 completion criterion):** "로그인 → 캘린더 화면까지 이동 가능" — good smoke test.

**Auto-decided: Move pgvector extension setup to Phase 1 infrastructure tasks.**

### Section 10: Long-Term Trajectory

**What comes after this ships (12-month trajectory):**
```
V1 (current PLAN.md): 7+ weeks → Developer 20-day test
V2: Add students → Multi-user, no structural changes needed (schema already multi-user)
V3: Commercialization → Payments, onboarding flow, subscription management (new scope)
```

**The architecture supports V2 well** — PostgreSQL + BullMQ designed for multi-user from day one.

**Technical debt introduced:**
- Prompt versioning in DB (PromptVersion table) creates a maintenance burden: every prompt change requires a DB migration. Mitigatable by storing prompts as JSON blobs with version keys, not rows.
- pgvector embedding model: if the embedding model changes, all existing embeddings become incompatible. Add embedding_model_version field to the embedding table.

**Reversibility rating: 3/5** — DB schema is the hardest to reverse; API routes and generators are easy. Multi-tenant schema is baked in from Phase 1.

**Auto-decided: Add embedding_model_version field recommendation to Phase 2/3 spec.**

### Section 11: Design & UX Review

```
LEARNER USER FLOW (as planned):
  Login ──▶ Calendar (20-day view) ──▶ [Day N]
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                               Package Ready   Package Pending
                               (enter session) ("준비 중...")
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             Flashcards (24)   Conversation (8+)  Reading (12 Q)
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                              Writing (1 task)
                                    │
                                    ▼
                              Error Review (5)
                                    │
                                    ▼
                              Session Complete
                                    │
                                    ▼
                              Tomorrow's package queued

INTERACTION STATE COVERAGE:
  Module      | Loading | Empty | Error | Success | Partial
  ────────────|---------|-------|-------|---------|─────────
  Flashcards  | ❌ missing| ✅ N/A| ❌   | ✅      | ✅ (review queue)
  Conversation| ❌ missing| N/A  | ✅ text fallback| ✅| N/A
  Reading     | ❌ missing| N/A  | ❌   | ✅      | ✅ (adaptive Q)
  Writing     | ❌ missing| N/A  | ❌   | ✅      | N/A
  Dashboard   | ❌ missing| ❌   | ❌   | ✅      | ✅
```

**Critical missing UX spec (from design doc §세션 시작 방식):**
> "오늘 세션 로그가 있으면 → 재개. 오늘 세션 없으면 → 2초 후 자동 인사 시작. 메뉴 없음, '시작' 버튼 없음."

This auto-start behavior is the **magical moment** of the product. It is NOT in PLAN.md. Add to Phase 4b:
- Page load → check for today's ConversationTurn records
- If none: 2-second delay → AI sends opening greeting automatically (no user action required)
- If exists: resume from last turn
- No "Start Session" button anywhere

**Auto-decided: Add auto-start spec and interaction state coverage map to Phase 4b and Phase 4 design requirements.**

### CEO Required Outputs

**NOT in scope (deferred to V2/V3):**
- Cross-device sync (IndexedDB note in design doc; V2 with students inherits PostgreSQL multi-device sync)
- Payment / subscription management (V3)
- App Store distribution (web-first, PWA install only)
- Cross-model validation (Claude + GPT-4o cross-check) — V2 architecture decision §3

**What already exists:**
- Nothing (100% greenfield). No existing code to leverage.

**Dream state delta:**
- This plan closes the gap from ChatGPT manual prompt → full structured daily learning system
- Remaining gap to 12-month ideal: student onboarding flow, payment, multi-device analytics dashboard (V2/V3)

**CEO Completion Summary:**

| Category | Status | Critical Gaps |
|----------|--------|---------------|
| Strategy/premise | ✅ User confirmed B (full system) | Design doc vs PLAN.md tension acknowledged |
| Architecture | ✅ Sound | Phase 4 blocked 5 weeks — acceptable |
| Error handling | ⚠️ Missing | 10 generators need error spec |
| Security | ⚠️ Partial | Prompt injection + R2 signed URLs |
| Data flows | ⚠️ Missing | Partial package UX, session resume, adaptive timeout |
| Code quality | ⚠️ Missing | BaseGenerator interface, PromptLoader pattern |
| Tests | ❌ Absent | No test plan at all |
| Performance | ⚠️ Partial | DB indexes not specified |
| Observability | ⚠️ Missing | Cron failure alert |
| Deployment | ⚠️ Risk | pgvector must move to Phase 1 |
| Long-term | ✅ Good | Architecture supports V2 multi-user |
| UX/Design | ⚠️ Missing | Auto-start behavior, loading states |

---

## /autoplan Eng Review — Phase 3

*Generated 2026-06-23 by /autoplan (SELECTIVE EXPANSION mode)*

### Step 0: Scope Challenge

**Complexity check:** 6 phases × multiple files/classes each = well over 8 files and 10+ new classes. This triggers the complexity check — but scope has already been confirmed by user (Decision #2: full production system). Proceeding with review rather than re-challenging scope.

**What existing code partially solves sub-problems?** Nothing. 100% greenfield. No leverage opportunities.

**Minimum set of changes to achieve stated goal:** Phase 1 + Phase 2 + Phase 3 + Phase 4 are all required to produce a single working learning session. No subset is shippable. (Phase 5 and 6 can be deferred without blocking the core loop.)

**Boring technology check:**
- Next.js 14 App Router: ✅ Current standard. App Router's streaming + Server Components match AI streaming use case.
- BullMQ + Redis: ✅ Proven, maintained. Alternative Inngest would reduce infra overhead but adds vendor dependency. BullMQ is the right call for Railway-hosted setup.
- Prisma + PostgreSQL: ✅ Standard TypeScript ORM. Note: pgvector requires `$queryRaw` — Prisma has no native vector type support. This is a known footgun.
- NextAuth v5: ⚠️ v5 is now `auth.js` and stable. Correct choice for App Router but API differs significantly from NextAuth v4 — ensure docs are for v5 specifically.
- shadcn/ui: ✅ Accessible primitives. Radix UI under the hood. Correct call.
- Cloudflare R2 + S3 SDK: ✅ R2 is S3-compatible. `@aws-sdk/client-s3` works. No R2-specific SDK needed.

### Technology Footgun Index

```
LIBRARY/PATTERN          | FOOTGUN                           | MITIGATION
─────────────────────────|───────────────────────────────────|──────────────────────────────
NextAuth v5 + App Router | v5 config is completely different  | Use auth.js docs (NOT old
                         | from v4. Wrong docs = broken auth. | NextAuth.com v4 docs).
─────────────────────────|───────────────────────────────────|──────────────────────────────
Prisma + pgvector        | Prisma schema has no vector type.  | Use Unsupported("vector")
                         | Raw SQL required for similarity.   | in schema; $queryRaw for
                         |                                    | cosine queries.
─────────────────────────|───────────────────────────────────|──────────────────────────────
BullMQ + Railway Redis   | Railway Redis connection resets    | Configure BullMQ with
                         | on dyno restart. Unhandled =       | autorun:true + stalledInterval
                         | stalled jobs forever.              | + explicit reconnect.
─────────────────────────|───────────────────────────────────|──────────────────────────────
MediaRecorder + Whisper  | Chrome outputs WebM/Opus.          | Always send as audio/webm;
                         | Firefox outputs OGG/Opus.          | codecs=opus. Whisper
                         | Safari outputs MP4/AAC.            | accepts all three.
                         | Unsupported codec = Whisper error. | Check MIME before upload.
─────────────────────────|───────────────────────────────────|──────────────────────────────
Claude streaming +       | App Router streaming RSC requires  | Use route.ts (API route)
Next.js App Router       | specific response pattern.         | not server component for
                         | Wrong pattern = no streaming.      | streaming LLM responses.
─────────────────────────|───────────────────────────────────|──────────────────────────────
R2 signed URLs           | R2 presigned URLs expire.          | Set expiry 24h (daily
                         | Image URLs in daily lesson         | lesson package lifespan).
                         | package must stay valid all day.   | Regenerate on 403.
─────────────────────────|───────────────────────────────────|──────────────────────────────
pgvector cosine distance | No index = full table scan on      | CREATE INDEX ... USING ivfflat
                         | every conversation similarity      | (embedding vector_cosine_ops)
                         | check. Fast to miss in dev,        | BEFORE first similarity query.
                         | catastrophic at 1000+ sessions.    |
─────────────────────────|───────────────────────────────────|──────────────────────────────
OpenAI TTS + R2 caching  | Caching TTS audio in R2 is         | Don't cache TTS. Generate
                         | legally grey (OpenAI ToS limits    | on-demand per session.
                         | redistribution of generated audio).| Latency: ~1-2s acceptable.
```

### Resolving the 5 Unresolved Decisions

**Auto-decided (each decision locked here, logged to audit trail):**

```
DECISION 1: 복습 큐 알고리즘 (SM-2 vs 고정 간격)
─────────────────────────────────────────────────
Recommendation: 고정 간격 (1/3/7/14일) for V1
Rationale: 20일 테스트에서 SM-2와 고정 간격의 차이는 미미함.
           SM-2는 long-term spacing effect (>30일) 이후 이점 발휘.
           고정 간격은 구현 단순: ReviewQueueEngine에 case 문 5줄.
           SM-2는 easiness factor, repetition count, interval 상태 추적 필요.
Auto-decided: 고정 간격 (1/3/7/14일) → ReviewQueue.algorithm = "fixed"

DECISION 2: 주관식 평가 모델 (Claude 단일 vs 교차 검증)
───────────────────────────────────────────────────────
Recommendation: Claude 단일 (V1)
Rationale: 교차 검증(Claude + GPT-4o)은 §3 아키텍처 결정이 이미 V2로 명시.
           V1에서는 같은 Claude, 다른 system prompt가 역할 격리 충분.
           비용: 교차 검증 시 모든 평가 호출이 2배. V1 ROI 없음.
Auto-decided: Claude 단일 → EvaluationAgent.model = "claude-sonnet-4-6"

DECISION 3: 이미지 전략
────────────────────────
Already resolved in PLAN.md: Unsplash/Pexels → DALL-E 3 → 텍스트 폴백. ✅

DECISION 4: pgvector 임계값
────────────────────────────
Recommendation: 코사인 유사도 임계값 0.85 (시작점)
Rationale: 실용적 시작점 — 0.85 이상이면 "거의 동일한 시나리오"로 간주 안전.
           0.90: 너무 엄격 (약간 다른 단어 사용해도 통과).
           0.80: 너무 느슨 (다른 주제도 유사하다고 판정 위험).
           모니터링: 첫 50개 시나리오 후 수동 검토하여 임계값 조정.
Auto-decided: threshold = 0.85 → pgvector WHERE 1 - (embedding <=> $1) > 0.85

DECISION 5: 인증 방식 (개발자 본인 테스트용)
─────────────────────────────────────────────
Recommendation: Google OAuth (PLAN.md 선택 유지)
Rationale: OAuth 초기 설정(Google Cloud Console) = 30분 1회 비용.
           이후 로그인 마찰 없음 (기존 Google 계정).
           단순 이메일/비번은 bcrypt + 세션 관리 직접 구현 필요 — OAuth보다 복잡.
           V2 (학생 추가) 시 OAuth가 훨씬 유리.
Auto-decided: Google OAuth 유지 → NextAuth.js v5 Google provider
```

### Implementation Sequencing Risks

**Phase 2 parallelism claim (PLAN.md: "Phase 1과 독립"):**
The plan says Phase 2 can run in parallel with Phase 1. This is PARTIALLY true:
- Phase 2 generators can be developed with mock data
- But `GenerationJob` table (Phase 1 schema) is required to store generation results
- `DailyPlanner` (Phase 2) requires `DailyLesson` table (Phase 1)

**Actual parallel boundary:**
```
Phase 1 (DB schema) ──────────────────────────────────────────▶
                         ↑ day 3: schema available
Phase 2 generators ─── mock ─── real DB ─────────────────────▶
                    days 1-2: local    day 3+: connected
```
**This works.** Mock-first for generators, connect to real DB after Phase 1 schema is stable.

**Phase 3 critical path (underspecified in plan):**
Phase 3 must implement `ReviewQueueEngine` before Phase 4a (flashcards post feedback). But Phase 3 also depends on `FlashcardAttempt` table existing — which is Phase 4a. **Circular dependency detected.**

Resolution: 
- Phase 3 creates empty `FlashcardAttempt` schema as a placeholder
- Phase 4a fills in the implementation
- ReviewQueueEngine reads from the table; Phase 4a writes to it

**Auto-decided: Add `FlashcardAttempt` schema as Phase 3 placeholder to break circular dependency.**

### Missing Implementation Specs

```
COMPONENT                | MISSING FROM PLAN              | SPEC NEEDED
─────────────────────────|───────────────────────────────|──────────────────────────────
PromptLoader             | How are prompts loaded?        | File: prompts/{name}.json
                         | DB vs filesystem vs hardcoded  | Loaded at startup into
                         |                                | PromptVersion table.
                         |                                | Git-versioned, hot-reloadable.
─────────────────────────|───────────────────────────────|──────────────────────────────
BaseGenerator            | No shared interface defined    | interface BaseGenerator {
                         |                                |   generate(ctx): AIArtifact
                         |                                |   validate(a): ValidationResult
                         |                                |   retry(a, reason): AIArtifact
                         |                                | }
─────────────────────────|───────────────────────────────|──────────────────────────────
ConversationTurn format  | LLM context window management  | Max 20 turns in context.
                         | not specified: how many turns  | Older turns summarized by
                         | stay in context window?        | Claude before being dropped.
─────────────────────────|───────────────────────────────|──────────────────────────────
AudioPipeline            | Audio chunk size for Whisper   | MediaRecorder: 10-second
                         | not specified. Too small =     | chunks (min). Send on pause
                         | poor transcription; too large  | or manual stop.
                         | = latency.                     |
─────────────────────────|───────────────────────────────|──────────────────────────────
DailyLesson freeze API   | POST /api/lesson/today/freeze  | Called by LearningScheduleEngine
                         | spec not defined               | when all generation_status=ready.
                         | (Phase 3 task exists but spec  | Returns DailyLesson with
                         | undefined)                     | all artifact IDs.
─────────────────────────|───────────────────────────────|──────────────────────────────
FlashcardAttempt schema  | Phase 4a creates table but     | Phase 3 placeholder:
                         | Phase 3 needs to read it       | id, daily_lesson_id, card_id,
                         |                                | card_type, response (0-3),
                         |                                | first_attempt_at, created_at
```

### Eng Dual Voices Summary

For /autoplan, the Eng review's "outside voice" (Codex) would produce a second opinion. The CEO review's Codex pass already surfaced the key engineering concern (scope mismatch — resolved by user as Decision #2). No additional Codex call needed for Eng review — user decision is locked.

**Eng Review auto-decided resolutions:**
- 5 unresolved decisions: all resolved (fixed interval, Claude single, Unsplash→DALLE→text, 0.85 threshold, Google OAuth)
- Technology footguns: catalogued
- Circular dependency: resolved (Phase 3 placeholder schema)
- Missing specs: catalogued for Phase 2/3/4 implementation

### Eng Review Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|---------|
| 18 | Eng | ReviewQueue: fixed interval (1/3/7/14일) | Mechanical | P5 (boring by default) | 20-day window too short for SM-2 benefits; simpler implementation | SM-2 algorithm |
| 19 | Eng | EvaluationAgent: Claude single model | Mechanical | P5 (boring by default) | §3 explicitly defers cross-validation to V2; V1 ROI is zero | Claude + GPT-4o cross-check |
| 20 | Eng | pgvector similarity threshold: 0.85 | Mechanical | P5 (explicit) | Practical midpoint; monitoring required after 50 scenarios | 0.80 (too loose) / 0.90 (too strict) |
| 21 | Eng | Google OAuth (keep PLAN.md choice) | Mechanical | P5 (boring by default) | 30min one-time setup cost vs manual bcrypt session mgmt | Simple email/password |
| 22 | Eng | PromptLoader: filesystem JSON (prompts/) | Mechanical | P4 (git-traceable) | Git version control is the right prompt version history tool | DB-stored prompts as primary |
| 23 | Eng | Phase 3 FlashcardAttempt placeholder schema | Mechanical | P1 (completeness) | Breaks Phase 3/4a circular dependency | Defer until Phase 4a |
| 24 | Eng | ConversationTurn: max 20 turns in LLM context | Mechanical | P5 (explicit) | Token budget management; Claude 200k context but cost control | Unlimited context window |
| 25 | Eng | MediaRecorder: 10-second chunks to Whisper | Mechanical | P5 (explicit) | Below 10s: poor transcription; above 60s: unacceptable latency | Continuous recording / 30s chunks |
| 26 | Eng | TTS: generate on-demand (no R2 cache) | Mechanical | P3 (legal/compliance) | OpenAI ToS limits redistribution of generated audio | Cache TTS in R2 |

---

## /autoplan DX Review — Phase 3.5

*Generated 2026-06-23 by /autoplan (SELECTIVE EXPANSION mode)*
*Carries forward D1=A, D2=A, D3=B, D4=B, D5=C from prior /plan-devex-review session*

### Confirmed DX Context (from prior session)

- **Developer persona (D1=A):** Jin as solo builder. 20-day self-test is the goal.
- **Plan over-engineering confirmed (D2=A):** PLAN.md is over-engineered for a 20-day self-test. (User confirmed this is acceptable — building full production system.)
- **Target TTHW (D3=B):** Fast prototype tier: 10-21 days from plan → first English learning session
- **Magical moment (D4=B):** `npm run dev` → `localhost:3000` → AI speaks automatically in 2 seconds
- **DX mode (D5=C):** TRIAGE — critical DX gaps only

### DX Product Classification

Primary surface: **Platform** (local dev environment + multiple cloud services) + **API/Service** (REST API routes). This is a developer building a consumer product where DX = jin's experience setting up and iterating on the system.

---

### Critical DX Gaps (TRIAGE mode — only blocking issues)

**GAP 1: Local dev requires 5+ cloud services before `npm run dev` produces anything**

```
REQUIRED BEFORE FIRST npm run dev:
  ├── Google Cloud Console → OAuth client ID + secret (30-60min first time)
  ├── Railway account + PostgreSQL instance (15min)
  ├── Railway Redis instance (5min)
  ├── Cloudflare R2 bucket + API keys (20min)
  ├── Anthropic API key (5min, already have)
  ├── OpenAI API key (5min, already have)
  └── GitHub/Google repo connected to Vercel (10min)

Total setup time before first page load: ~90 minutes

MAGICAL MOMENT ("AI speaks in 2s") requires ALL of the above to be working.
```

**Auto-decided: Add Docker Compose for local dev to Phase 1. PostgreSQL + Redis run locally via Docker. R2 can be mocked with MinIO (S3-compatible). Google OAuth can use a `DEV_BYPASS_AUTH=true` flag for local dev.**

**GAP 2: No `.env.example` in plan**

14+ environment variables across 6 services. Not documented in plan. Developer will spend time discovering what's needed.

**Auto-decided: Add `.env.example` creation to Phase 1 completion criteria.**

```
Required .env variables (complete list):
NEXTAUTH_URL, NEXTAUTH_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
DATABASE_URL
REDIS_URL
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
ANTHROPIC_API_KEY
OPENAI_API_KEY
CLOUDFLARE_R2_ENDPOINT
```

**GAP 3: No seed script → first `npm run dev` shows empty calendar**

Without seed data, Phase 1 completion shows a login screen → empty calendar. The magical moment requires a seeded daily lesson. Plan has no seed script.

**Auto-decided: Add seed script to Phase 1 that creates: test user, 20-day curriculum, today's lesson (mock data, no AI generation), 3 mock vocabulary cards with placeholder images.**

**GAP 4: No mock mode for AI services in local dev**

Every AI call in development hits the real API. Costs money, has latency, requires internet, and can fail. For iterating on UI (Phase 4), this is a significant friction point.

**Auto-decided: Add `AI_MOCK_MODE=true` env var support to Phase 2. When set, all generators return fixture data from `__mocks__/fixtures/`. Production never uses this flag.**

**GAP 5: "AI speaks in 2 seconds" is not achievable on first boot**

The magical moment requires:
1. Today's daily package already generated (pre-generation at 2am cron)
2. R2 images already cached (image generation is async)
3. TTS for opening greeting: ~1-2s (acceptable)
4. Conversation AI response: ~5-6s (Whisper 2s + Claude 3s + TTS 1s) 

The "2 seconds" is the TTS greeting, not the full round-trip. This is achievable ONLY if:
- Daily package is pre-generated (Phase 3 cron)
- Developer triggers cron manually on first boot

**Auto-decided: Add `npm run generate:today` script to Phase 3 that manually triggers today's package generation. Add to README as step 3 after `npm install` and `npm run db:migrate`.**

---

### TTHW Assessment

```
TTHW ANALYSIS (D3=B: target 10-21 days)
══════════════════════════════════════════════════════════════
Week 1-2:  Phase 1 (foundation) + Phase 2 (generators, parallel)
           ✅ Architecture in place by end of Week 2
           
Week 2-3:  Phase 3 (learning engine)
           ✅ Cron job + freeze API working

Week 3-5:  Phase 4 (learning screens)
           ← FIRST ENGLISH LEARNING SESSION HERE (Week 4-5 earliest)
           
TTHW gap: 4-5 weeks. Target D3=B was 10-21 days.
Gap = 2-3x over target.
══════════════════════════════════════════════════════════════
```

**Note:** This TTHW gap was already identified and USER ACCEPTED (Decision #2: full production system). With Docker Compose + seed script (GAP 1 & 3 fixes), local setup time drops to 15 minutes instead of 90. The first learning session still requires Phase 4 to complete.

**DX mitigation:** Phase 4b (conversation only) is the minimum viable learning session. Suggest building Phase 4b as the first Phase 4 deliverable — even if flashcards aren't done, `npm run dev` → AI conversation works. This gives jin a learning session in Week 3, not Week 5.

**Auto-decided: Add Phase 4b as first Phase 4 priority (before 4a flashcards). First conversation session = Week 3 milestone.**

---

### Getting Started Experience (Required DX artifact)

**Auto-decided: Add README.md getting-started section to Phase 1 completion criteria.**

```
README.md required sections (Phase 1):
  1. Prerequisites (Node 20+, Docker, API keys list)
  2. Clone & install (2 commands)
  3. Environment setup (.env.example copy instructions + 5 required keys)
  4. Local services (docker-compose up → PostgreSQL + Redis + MinIO)
  5. Database setup (npx prisma migrate dev)
  6. Seed data (npm run db:seed)
  7. Generate today's lesson (npm run generate:today)
  8. Start development (npm run dev → localhost:3000)
  9. First session (visit /today → 2s → AI greets you)
  
Target: developer unfamiliar with the project can run first session in 20 minutes.
```

---

### DX Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|---------|
| D1 | DX | Developer persona: jin as solo builder | User decision | — | Confirmed in prior /plan-devex-review session | Team/student persona |
| D2 | DX | Over-engineering confirmed (acceptable) | User decision | — | User chose full production system (Decision #2) | Scope reduction |
| D3 | DX | TTHW target: 10-21 days (not achieved — 4-5 weeks) | Acknowledged gap | — | User accepted; mitigated by Phase 4b-first priority | N/A |
| D4 | DX | Magical moment: `npm run dev` → AI greets in 2s | User decision | — | Confirmed in prior session; requires seed + package generation | Button-click start |
| D5 | DX | DX TRIAGE mode | User decision | — | Confirmed in prior session | DX EXPANSION / DX POLISH |
| 27 | DX | Docker Compose for local PostgreSQL + Redis + MinIO | Mechanical | P3 (fail-fast) | 90min cloud setup → 5min local setup | Cloud-only local dev |
| 28 | DX | `.env.example` in Phase 1 | Mechanical | P1 (completeness) | 14+ env vars discovered by trial-and-error = DX disaster | No .env.example |
| 29 | DX | Seed script with mock daily lesson | Mechanical | P1 (completeness) | Empty calendar ≠ magical moment; seed required for local dev | Real AI generation in dev |
| 30 | DX | `AI_MOCK_MODE=true` for UI iteration | Mechanical | P3 (fail-fast) | Real AI calls during UI iteration = slow + costly | Real API always |
| 31 | DX | `npm run generate:today` manual trigger | Mechanical | P1 (completeness) | 2am cron doesn't fire in local dev; manual trigger bridges gap | Wait for cron |
| 32 | DX | Phase 4b (conversation) before Phase 4a (flashcards) | Selective expansion | P3 (fail-fast) | First learning session in Week 3 vs Week 5; validates core hypothesis sooner | Flashcards first (as planned) |
| 33 | DX | README.md getting-started in Phase 1 | Mechanical | P1 (completeness) | 20-min onboarding target; currently no README | No README until Phase 5 |

---

## /autoplan Final Gate — Phase 4

*Generated 2026-06-23 by /autoplan (SELECTIVE EXPANSION mode)*

### Review Pipeline Summary

| Phase | Reviewer | Status | Key Findings |
|-------|----------|--------|--------------|
| CEO | Claude subagent + Codex | ✅ Complete | Scope confirmed (user Decision #2); 11 sections reviewed; 10 auto-decisions |
| Design | Claude (text-only; designer unavailable) | ✅ Complete | 7 dimensions reviewed; 7 auto-decisions; 1 taste decision flagged |
| Eng | Claude | ✅ Complete | 5 unresolved decisions resolved; technology footguns catalogued; 9 auto-decisions |
| DX | Claude (D1-D5 carried forward) | ✅ Complete | 5 critical DX gaps identified; 7 auto-decisions; Phase 4b-first recommended |

**Total decisions: 33 (31 auto-decided, 2 taste decisions, 1 user challenge already resolved)**

---

### Consolidated Action List (what needs to be added to the implementation plan)

These items were auto-decided during the review and must be added to the appropriate phase. They are **not optional additions** — they are completeness gaps discovered during review.

```
PHASE 1 ADDITIONS:
  ├── pgvector extension setup (moved from Phase 3) — see Dec #6
  ├── DESIGN.md stub (colors, typography, spacing, animation timing) — see Dec #15
  ├── Docker Compose (PostgreSQL + Redis + MinIO for local dev) — see Dec #27
  ├── .env.example (14+ variables documented) — see Dec #28
  ├── Seed script (test user + mock daily lesson + 3 vocabulary cards) — see Dec #29
  └── README.md getting-started (20-min target) — see Dec #33

PHASE 2 ADDITIONS:
  ├── BaseGenerator interface (generate / validate / retry) — see Dec #3
  ├── PromptLoader (filesystem JSON in prompts/) — see Dec #22
  ├── AI_MOCK_MODE=true support for all generators — see Dec #30
  ├── Error handling table (timeout / rate limit / malformed JSON / validation failure) — see CEO §2
  ├── R2 signed URLs (not public) for all image artifacts — see CEO §3
  └── Prompt injection sanitization in conversation input — see CEO §3

PHASE 3 ADDITIONS:
  ├── FlashcardAttempt placeholder schema (breaks Phase 3/4a circular dependency) — see Dec #23
  ├── npm run generate:today manual trigger — see Dec #31
  ├── Cron failure alert (email/Slack to developer) — see Dec #4
  └── pgvector ivfflat index on embedding column — see CEO §7

PHASE 4 ADDITIONS:
  ├── Phase 4b (conversation) first, before 4a (flashcards) — see Dec #32
  ├── Auto-start conversation spec: page load → 2s delay → AI greeting (no button) — see Dec #12
  ├── Interaction state map for all 8 screens (loading/empty/error/success/partial) — see Design §2
  ├── IA spec for all screens (priority hierarchy) — see Design §1
  ├── Anti-slop visual constraints (full-screen card, waveform visualization, etc.) — see Design §4
  ├── Mobile-first specs (375px primary, swipe gestures for flashcard) — see Dec #16
  ├── Keyboard interaction specs for all Phase 4 screens — see Dec #17
  ├── Partial lesson state UX ("준비 중..." loading with auto-refresh) — see CEO §4
  ├── Session resume logic (check ConversationTurn records on page load) — see CEO §4
  └── Adaptive question timeout fallback (preset question if >8s) — see CEO §4

PHASE 5 ADDITIONS:
  ├── Session complete screen with specific stats + tomorrow teaser — see Design §3
  └── (Admin dashboard 10 screens §15 — plan already mentions; no additions needed)

PHASE 6 ADDITIONS:
  └── embedding_model_version field on vector embedding table — see CEO §10
```

---

### Taste Decisions — Final Gate

Two decisions were flagged as genuine taste choices (not mechanical). Surfacing now.

---

**D8 — Dual-theme (bright flashcard mode / dark learning mode)**

*Reply with A or B.*

**The issue:** Every learning module has different cognitive needs. Flashcards need high contrast (white background, bright images). Conversation/reading/writing need focus mode (reduced visual noise, dark or muted background). Implementing two themes means 2× CSS custom properties to maintain. But a single theme that works for both is a compromise that doesn't excel at either.

**What we might be missing:** Jin is building this for himself first. He can always add the dark mode theme in Phase 6 if he finds the bright theme distracting during conversation/reading. Starting with one theme is simpler and faster.

**Recommendation: A** — dual-theme. The cognitive contrast is a core product hypothesis (immersive learning during conversation vs. quick-review during flashcards), and Tailwind makes dark mode trivial with `dark:` variants.

**A) Dual-theme: flashcard bright / learning dark** *(recommended)*
Flashcard screens: white background, high-contrast images. Conversation/reading/writing: `bg-gray-950` with muted text. Implement via Tailwind `dark:` class toggle per module.

Completeness: 9/10 — correctly models different cognitive modes. Slightly more CSS to maintain.

**B) Single neutral theme throughout**
One consistent theme (light gray background, dark text) across all modules. Simpler implementation.

Completeness: 7/10 — technically complete. Misses the cognitive mode differentiation, which is a product hypothesis worth testing.

**Net:** A is the more complete design hypothesis to test. B is faster to ship. If jin is concerned about time, defer dual-theme to Phase 6.

---

**D9 — Phase 4 priority: conversation-first (4b before 4a) vs. flashcards-first (as planned)**

*Reply with A or B.*

**The issue:** The plan sequences flashcards (4a) before conversation (4b). The DX review recommends flipping this — doing 4b first — so jin gets a working learning session (the core hypothesis: AI conversation embedded in vocabulary learning) in Week 3 instead of Week 5. But flashcards (4a) are simpler to implement (no audio pipeline) and might be a better confidence builder.

**What we might be missing:** Flashcards without conversation = the product hypothesis isn't being tested yet. The conversation module is the hardest to implement (MediaRecorder, Whisper, Claude, TTS pipeline) and the riskiest. Finding out in Week 5 that the conversation pipeline has a blocking issue is worse than finding out in Week 3.

**Recommendation: A** — conversation first (4b before 4a). Validates the riskiest component earliest. "The hardest thing should ship first."

**A) Conversation first (4b → 4a → 4c → 4d → 4e)** *(recommended)*
Build Phase 4b (AI conversation room) first. First learning session test = Week 3. Flashcards follow. Higher risk but earlier validation of the core hypothesis.

Completeness: 10/10 for hypothesis validation. Risk: audio pipeline complexity may take longer than expected.

**B) Flashcards first (4a → 4b → 4c → 4d → 4e — as planned)**
Build flashcards first. Lower technical risk, faster to first visible feature. Conversation follows after.

Completeness: 10/10 for implementation order. Risk: core hypothesis (AI conversation = learning) not tested until Week 5.

**Net:** A is the better product decision. B is the safer implementation decision. For a 20-day self-test where the core hypothesis is AI conversation, A gives more signal sooner.

---

### Full Decision Audit Trail (complete list, all phases)

| # | Phase | Decision | Classification | Auto/User | Rationale |
|---|-------|----------|---------------|-----------|-----------|
| 1 | CEO | SELECTIVE EXPANSION mode | Mechanical | Auto | New product, pre-validation |
| 2 | CEO | Keep PLAN.md full production scope (B) | User decision | **User** | User explicitly chose full system |
| 3 | CEO | BaseGenerator interface | Mechanical | Auto | 10 generators share pattern |
| 4 | CEO | Cron failure alert | Mechanical | Auto | Silent failure = no learning session |
| 5 | CEO | Auto-start spec to Phase 4b | Mechanical | Auto | Design doc is explicit |
| 6 | CEO | pgvector to Phase 1 | Mechanical | Auto | Extension required before Phase 3 |
| 7 | CEO | Resolve 5 decisions before Phase 2 | Mechanical | Auto | Circular dependency risk |
| 8 | CEO | LLM error handling spec to Phase 2 | Mechanical | Auto | 10 generators, zero error specs |
| 9 | CEO | Streaming spec to Phase 2 | Mechanical | Auto | P95 ≤6s requires streaming |
| 10 | CEO | Partial lesson state handling | Mechanical | Auto | Learner UX undefined for partial |
| 11 | Design | Full-screen card layout | Mechanical | Auto | Subtraction default; design doc |
| 12 | Design | Auto-start conversation | Mechanical | Auto | Design doc is explicit |
| 13 | Design | Swipe gestures for flashcard | Selective | Auto | Mobile-primary PWA |
| **14** | **Design** | **Dual-theme bright/dark** | **Taste** | **→ D8** | Cognitive contrast hypothesis |
| 15 | Design | DESIGN.md stub in Phase 1 | Mechanical | Auto | No design system = drift |
| 16 | Design | Mobile-first to Phase 4 | Mechanical | Auto | PWA retrofit is expensive |
| 17 | Design | Text fallback to Phase 4b contract | Mechanical | Auto | Architectural constraint |
| 18 | Eng | Fixed interval (1/3/7/14일) | Mechanical | Auto | 20-day window too short for SM-2 |
| 19 | Eng | EvaluationAgent: Claude single | Mechanical | Auto | §3 explicitly defers to V2 |
| 20 | Eng | pgvector threshold: 0.85 | Mechanical | Auto | Practical midpoint |
| 21 | Eng | Google OAuth (keep) | Mechanical | Auto | 30min one-time cost < custom auth |
| 22 | Eng | PromptLoader: filesystem JSON | Mechanical | Auto | Git-traceable |
| 23 | Eng | Phase 3 FlashcardAttempt placeholder | Mechanical | Auto | Breaks circular dependency |
| 24 | Eng | ConversationTurn: max 20 in context | Mechanical | Auto | Token budget management |
| 25 | Eng | MediaRecorder: 10-second chunks | Mechanical | Auto | Transcription quality vs latency |
| 26 | Eng | TTS: on-demand (no R2 cache) | Mechanical | Auto | OpenAI ToS |
| D1 | DX | Developer persona: jin solo | User decision | **User** | Prior session D1=A |
| D2 | DX | Over-engineering: acceptable | User decision | **User** | Prior session D2=A |
| D3 | DX | TTHW gap acknowledged | User decision | **User** | Prior session D3=B |
| D4 | DX | Magical moment: npm run dev → AI | User decision | **User** | Prior session D4=B |
| D5 | DX | DX TRIAGE mode | User decision | **User** | Prior session D5=C |
| 27 | DX | Docker Compose local dev | Mechanical | Auto | 90min setup → 5min |
| 28 | DX | .env.example | Mechanical | Auto | 14+ env vars |
| 29 | DX | Seed script | Mechanical | Auto | Empty calendar ≠ magical moment |
| 30 | DX | AI_MOCK_MODE | Mechanical | Auto | UI iteration without AI cost |
| 31 | DX | npm run generate:today | Mechanical | Auto | Cron doesn't fire locally |
| **32** | **DX** | **Phase 4b first vs 4a first** | **Taste** | **→ D9** | Validates riskiest component earliest |
| 33 | DX | README.md in Phase 1 | Mechanical | Auto | 20-min onboarding target |

---

### Final Gate Decisions (User Responses)

**D8 = A: Dual-theme confirmed.**
- Flashcard screens: white background, high-contrast images (`bg-white`, bright palette)
- Conversation/Reading/Writing screens: `bg-gray-950` with muted text (dark focus mode)
- Implement via Tailwind `dark:` class toggled by module context, not `prefers-color-scheme`
- Add to DESIGN.md: `mode: flashcard | focus` — set by parent layout component

**D9 = A: Conversation-first (4b before 4a) confirmed.**
- Updated Phase 4 execution order: `4b → 4a → 4c → 4d → 4e`
- Week 3 milestone: working AI conversation session (audio pipeline validated)
- Week 4 milestone: flashcards complete (conversation → flashcards → reading flow)
- Risk: audio pipeline complexity. Mitigation: mock Whisper in first iteration (`AI_MOCK_MODE=true`)

---

### /autoplan Complete — Final Summary

**Status: APPROVED** (33 decisions made; 31 auto-decided, 5 user decisions, 2 taste decisions resolved)

**What changed in this review (additions to implement):**

*Phase 1 (before any other phase starts):*
- pgvector extension in Railway PostgreSQL setup
- DESIGN.md stub (dual-theme system: flashcard/focus modes)
- Docker Compose (local PostgreSQL + Redis + MinIO)
- `.env.example` (all 14+ variables documented)
- Seed script (test user + mock daily lesson + 3 vocabulary cards)
- README.md getting-started guide (20-min target)

*Phase 2:*
- BaseGenerator interface with `generate/validate/retry` methods
- PromptLoader from filesystem JSON (`prompts/` directory)
- `AI_MOCK_MODE=true` support for all generators
- Error handling table per generator (timeout/429/malformed JSON/validation failure)
- R2 signed URLs (24-hour expiry)
- Prompt injection sanitization in conversation input

*Phase 3:*
- FlashcardAttempt placeholder schema (breaks circular dependency with 4a)
- `npm run generate:today` manual trigger script
- Cron failure alert (developer notification on 2am job failure)
- ivfflat index on pgvector embedding column

*Phase 4 (reordered: 4b → 4a → 4c → 4d → 4e):*
- Auto-start conversation: page load → 2s delay → AI greeting (no button)
- Interaction state map implemented for all 8 screens
- IA priority hierarchy enforced per screen
- Anti-slop visual constraints (full-screen card, waveform visualization, two-panel reading)
- Mobile-first layout specs at 375px (swipe gestures for flashcard)
- Keyboard interaction specs for all screens
- Partial lesson state UX
- Session resume logic
- Adaptive question timeout fallback

*Phase 5:*
- Session complete screen with specific stats + tomorrow teaser

*Phase 6:*
- embedding_model_version field on vector table

**Resolved decisions (previously unresolved at bottom of PLAN.md):**
1. ReviewQueue: fixed interval (1/3/7/14일) ← SM-2 deferred to V2
2. EvaluationAgent: Claude single model ← cross-validation deferred to V2
3. Image strategy: Unsplash/Pexels → DALL-E 3 → text fallback ✅ already resolved
4. pgvector threshold: 0.85 cosine similarity
5. Auth: Google OAuth (keep)

**Technology footguns catalogued** (see Eng Review §Technology Footgun Index):
NextAuth v5 docs, Prisma pgvector raw SQL, BullMQ reconnect, MediaRecorder codec, Claude streaming in App Router, R2 URL expiry, pgvector index missing.

**TTHW:** 4-5 weeks to first English learning session. Gap acknowledged (user confirmed full production scope). Mitigation: Docker Compose cuts setup from 90min to 5min; Phase 4b-first cuts first AI session from Week 5 to Week 3.

*Review complete. Ready for implementation.*
