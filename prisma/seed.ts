import {
  PrismaClient,
  GenerationStatus,
  ArtifactType,
  ValidationStatus,
  SafetyStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Upsert dev user (matches DEV_BYPASS_AUTH credentials from auth.ts)
  const user = await prisma.user.upsert({
    where: { email: "dev@example.com" },
    create: {
      id: "dev-user-id",
      email: "dev@example.com",
      name: "Dev User",
    },
    update: {
      name: "Dev User",
    },
  });

  console.log(`✓ User: ${user.email}`);

  // 2. Upsert UserProfile
  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      currentLevel: 3,
      studyGoal: "비즈니스 영어",
      dailyTargetMinutes: 50,
      diagnosisAnswers: { level: 3, goal: "비즈니스 영어", dailyTarget: 50 },
    },
    update: {},
  });

  console.log(`✓ UserProfile: level ${profile.currentLevel}`);

  // 3. Upsert MonthlyCurriculum for the current month
  const curriculum = await prisma.monthlyCurriculum.upsert({
    where: {
      userId_month_year: {
        userId: user.id,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      },
    },
    create: {
      userId: user.id,
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      version: 1,
      theme: "일상 비즈니스",
      vocabDomains: ["business", "technology", "communication"],
    },
    update: {},
  });

  console.log(`✓ MonthlyCurriculum: ${curriculum.year}-${curriculum.month}`);

  // 4. Upsert today's DailyLesson (studyDay 1, READY status, calendarDate = today)
  const lesson = await prisma.dailyLesson.upsert({
    where: {
      curriculumId_studyDay: {
        curriculumId: curriculum.id,
        studyDay: 1,
      },
    },
    create: {
      userId: user.id,
      curriculumId: curriculum.id,
      studyDay: 1,
      calendarDate: today,
      generationStatus: GenerationStatus.READY,
      vocabStatus: GenerationStatus.READY,
      sentenceStatus: GenerationStatus.READY,
      readingStatus: GenerationStatus.READY,
      speakingStatus: GenerationStatus.READY,
      writingStatus: GenerationStatus.READY,
    },
    update: {
      calendarDate: today,
      generationStatus: GenerationStatus.READY,
      vocabStatus: GenerationStatus.READY,
      sentenceStatus: GenerationStatus.READY,
      readingStatus: GenerationStatus.READY,
      speakingStatus: GenerationStatus.READY,
      writingStatus: GenerationStatus.READY,
    },
  });

  console.log(
    `✓ DailyLesson: studyDay ${lesson.studyDay}, status ${lesson.generationStatus}`
  );

  // 5. Create 3 mock VocabularyCard AIArtifacts
  const mockVocabCards = [
    {
      word: "paradigm",
      definition: "A typical example or pattern of something; a model.",
      exampleSentence:
        "The new software represents a paradigm shift in how we work.",
      collocations: ["paradigm shift", "new paradigm", "dominant paradigm"],
      mnemonic:
        "Para (beside) + dig + ram: imagine digging a RAM chip beside a model computer",
      imagePrompt:
        "A visual model of a computer architecture diagram with glowing pathways",
    },
    {
      word: "leverage",
      definition: "Use (something) to maximum advantage; to use as a lever.",
      exampleSentence:
        "We can leverage our existing customer base to grow the new product.",
      collocations: ["leverage data", "leverage expertise", "financial leverage"],
      mnemonic:
        "A lever in a 'age' of technology — using tools to lift heavy tasks",
      imagePrompt:
        "A large lever lifting a heavy boulder, representing power and advantage",
    },
    {
      word: "synergy",
      definition:
        "The interaction of elements that produces a combined effect greater than the sum of parts.",
      exampleSentence:
        "The merger created synergy between the two companies' strengths.",
      collocations: ["create synergy", "synergy effect", "team synergy"],
      mnemonic: "Syn (together) + energy: combined energy from working together",
      imagePrompt:
        "Two gears interlocking perfectly, each powering the other, glowing with energy",
    },
  ];

  for (let index = 0; index < mockVocabCards.length; index++) {
    const card = mockVocabCards[index];
    await prisma.aIArtifact.upsert({
      where: {
        artifactId: `seed-vocab-${index + 1}`,
      },
      create: {
        artifactId: `seed-vocab-${index + 1}`,
        userId: user.id,
        dailyLessonId: lesson.id,
        studyDay: 1,
        curriculumVersion: 1,
        difficultyLevel: 3,
        generationSeed: `seed-${index + 1}`,
        modelVersion: "mock-v1",
        promptVersion: "seed-v1",
        validationStatus: ValidationStatus.PASSED,
        validationScore: 0.95,
        safetyStatus: SafetyStatus.SAFE,
        content: card,
        artifactType: ArtifactType.VOCABULARY_CARD,
      },
      update: {
        content: card,
        dailyLessonId: lesson.id,
      },
    });
    console.log(`✓ VocabularyCard ${index + 1}: ${card.word}`);
  }

  console.log("\n✅ Seed complete. Run with DEV_BYPASS_AUTH=true to test.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
