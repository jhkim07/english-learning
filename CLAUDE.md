# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered English learning web system (SPEC.md). No code exists yet — this repository is at the pre-implementation stage. The full spec is in Korean; this document summarizes the key architectural decisions for implementation.

## What We're Building

A responsive PWA (Progressive Web App) where **AI generates all learning content** but **program code strictly controls daily volume and learning flow**. The core design principle: AI creates content; the learning engine controls quantity and sequence.

## Planned System Architecture (from SPEC.md §21)

```
[Responsive Web / PWA]
        │
        ▼
[API Server + Auth]
        ├── Learning Schedule Engine
        ├── Fixed-Volume Control Engine
        └── Review & Progression Engine
        │
        ▼
[AI Orchestration Service]
        ├── Daily Planner
        ├── Vocabulary Generator
        ├── Image Generator
        ├── Reading Generator
        ├── Adaptive Question Generator
        ├── Speaking Agent
        ├── Writing Generator
        ├── Evaluation Agent
        └── Validation Agent
        │
        ▼
[Data Storage]
        ├── User & Learning History DB
        ├── Image/Audio Object Storage
        ├── Generation Job Queue
        └── Vector Index (for duplicate detection)
```

## Core AI Roles — Must Remain Separate

- **Generation AI**: creates vocabulary cards, mnemonic images, reading passages, conversation scenarios, writing prompts
- **Validation AI**: verifies content correctness before it reaches learners (one answer only, evidence exists in passage, appropriate difficulty)
- **Evaluation AI**: scores learner responses, classifies error types, feeds into next review queue

A single AI must not generate and self-validate its own content.

## Daily Fixed Learning Volume (Month 1)

| Area | Daily Fixed Amount |
|------|--------------------|
| New vocabulary flip cards | 12 |
| Sentence memorization flip cards | 4 |
| Review flip cards | 8 (total 24 cards/day) |
| Conversation | 1 random scenario, ≥8 learner turns |
| Reading | 1 passage (400–450 words) + 12 questions |
| Writing | 1 task (180–220 words) |
| Error review | 5 items |

The 12 reading questions = 6 core questions + 6 adaptive follow-up questions (one per core question, generated in real time based on correct/incorrect). This keeps total count fixed regardless of accuracy.

## Key Domain Objects

```
User, UserProfile, MonthlyCurriculum, DailyLesson, AIArtifact, GenerationJob
VocabularyCard, SentenceCard, MnemonicImage, ConfusableWordGroup
FlashcardAttempt, ReviewQueue
SpeakingScenario, ConversationTurn, SpeakingEvaluation
ReadingPassage, ReadingQuestion, AdaptiveQuestion, ReadingAttempt, RemediationChain
WritingPrompt, WritingSubmission, WritingRevision
ErrorRecord, WeeklyAssessment, MonthlyExam, ProgressionDecision
PromptVersion, ModelVersion, ValidationResult, ContentReport
```

## AI Artifact Versioning — Required on Every Generated Item

Every AI-generated artifact must store: `artifact_id`, `user_id`, `study_day`, `curriculum_version`, `difficulty_level`, `generation_seed`, `model_version`, `prompt_version`, `generated_at`, `validation_status`, `validation_score`, `safety_status`.

## Daily Lesson Package Immutability

Once a learner opens today's lesson, the package is frozen for that calendar day — survives page refresh, browser close, device switch, and brief network loss. Only conversation follow-up turns and adaptive reading questions are generated in real time.

## Performance Targets

| Feature | Target |
|---------|--------|
| Page render | ≤ 2.5s |
| AI text generation | 95th percentile ≤ 6s |
| Adaptive follow-up question | ≤ 6s |
| Conversation AI response | ≤ 8s |
| Speech transcription | ≤ 5s after utterance |
| Mnemonic images | Pre-generated before session starts |

Images must be pre-generated and cached before the lesson begins — never generated mid-session.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## MVP Acceptance Criteria (SPEC.md §20)

20 criteria must all pass. Key ones that affect architecture decisions:
- Every new vocabulary card must have a mnemonic image with alt text
- No AI-generated question reaches the learner without passing validation
- Incorrect answer → next question targets the specific error type (new question, not a word-swap remix)
- Correct answer → next question is a harder extension
- Page refresh must not change today's lesson content
- Learners who don't use voice can still complete the full daily session
