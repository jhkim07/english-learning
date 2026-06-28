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

  // 2b. Upsert LevelProfile for dev user (and backfill for all users)
  const levelMap: Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0 }

  const userProfiles = await prisma.userProfile.findMany({
    select: { userId: true, currentLevel: true }
  })

  for (const up of userProfiles) {
    const level = levelMap[up.currentLevel] ?? 1.0
    await prisma.levelProfile.upsert({
      where: { userId: up.userId },
      create: { userId: up.userId, vocabulary: level, conversation: level, reading: level, writing: level },
      update: {},  // don't overwrite existing profiles
    })
    // Create initial LevelHistory for all 4 areas
    for (const area of ['VOCABULARY', 'CONVERSATION', 'READING', 'WRITING'] as const) {
      await prisma.levelHistory.create({
        data: { userId: up.userId, area, fromLevel: level, toLevel: level, reason: 'INITIAL' }
      }).catch(() => {}) // skip if already exists
    }
  }
  console.log(`✓ Seeded LevelProfile for ${userProfiles.length} users`)

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

  // 5. Create 12 mock VocabularyCard AIArtifacts
  const mockVocabCards = [
    {
      word: "paradigm",
      partOfSpeech: "noun",
      definition: "A typical example or pattern of something; a model.",
      koreanMeaning: "패러다임, 전형적인 예시",
      exampleSentence: "The new software represents a paradigm shift in how we work.",
      collocations: ["paradigm shift", "new paradigm", "dominant paradigm"],
      mnemonic: "Para (beside) + dig + ram: imagine digging a RAM chip beside a model computer",
      imagePrompt: "A visual model of a computer architecture diagram with glowing pathways",
    },
    {
      word: "leverage",
      partOfSpeech: "verb / noun",
      definition: "Use (something) to maximum advantage; to use as a lever.",
      koreanMeaning: "레버리지, 활용하다",
      exampleSentence: "We can leverage our existing customer base to grow the new product.",
      collocations: ["leverage data", "leverage expertise", "financial leverage"],
      mnemonic: "A lever in a 'age' of technology — using tools to lift heavy tasks",
      imagePrompt: "A large lever lifting a heavy boulder, representing power and advantage",
    },
    {
      word: "synergy",
      partOfSpeech: "noun",
      definition: "The interaction of elements that produces a combined effect greater than the sum of parts.",
      koreanMeaning: "시너지, 상승효과",
      exampleSentence: "The merger created synergy between the two companies' strengths.",
      collocations: ["create synergy", "synergy effect", "team synergy"],
      mnemonic: "Syn (together) + energy: combined energy from working together",
      imagePrompt: "Two gears interlocking perfectly, each powering the other, glowing with energy",
    },
    {
      word: "ambiguous",
      partOfSpeech: "adjective",
      definition: "Open to more than one interpretation; not having one obvious meaning.",
      koreanMeaning: "모호한, 불분명한",
      exampleSentence: "The contract contained ambiguous language that led to a dispute.",
      collocations: ["ambiguous language", "morally ambiguous", "deliberately ambiguous"],
      mnemonic: "Ambi (both) + guess: you have to guess in both directions",
      imagePrompt: "A fork in the road with two identical signs pointing in opposite directions, misty background",
    },
    {
      word: "catalyst",
      partOfSpeech: "noun",
      definition: "A person or thing that precipitates an event or speeds up a process.",
      koreanMeaning: "촉매제, 변화의 계기",
      exampleSentence: "The new CEO acted as a catalyst for the company's rapid transformation.",
      collocations: ["act as a catalyst", "catalyst for change", "social catalyst"],
      mnemonic: "Cat + a + list: a cat listing all the changes it causes just by walking in",
      imagePrompt: "A spark igniting a chain of falling dominoes that spread outward in all directions",
    },
    {
      word: "coherent",
      partOfSpeech: "adjective",
      definition: "Logical, consistent, and forming a unified whole.",
      koreanMeaning: "일관된, 논리적인",
      exampleSentence: "Her presentation was coherent and easy to follow from start to finish.",
      collocations: ["coherent argument", "coherent strategy", "coherent narrative"],
      mnemonic: "Co (together) + here + nt: everything is together right here, connected",
      imagePrompt: "Puzzle pieces fitting perfectly together to form a clear picture",
    },
    {
      word: "facilitate",
      partOfSpeech: "verb",
      definition: "Make an action or process easier or smoother.",
      koreanMeaning: "촉진하다, 쉽게 하다",
      exampleSentence: "The new platform will facilitate collaboration across remote teams.",
      collocations: ["facilitate communication", "facilitate learning", "facilitate growth"],
      mnemonic: "Facile (easy) + ate: you ate the difficulty to make it easy",
      imagePrompt: "A door opening wide automatically as someone approaches, path clear ahead",
    },
    {
      word: "inherent",
      partOfSpeech: "adjective",
      definition: "Existing as an essential or permanent attribute of something.",
      koreanMeaning: "내재된, 본질적인",
      exampleSentence: "There is an inherent risk in any entrepreneurial venture.",
      collocations: ["inherent risk", "inherent value", "inherent problem"],
      mnemonic: "In + here + nt: the quality is already 'in here', built inside",
      imagePrompt: "A seed with a tiny tree already visible inside it, glowing from within",
    },
    {
      word: "mitigate",
      partOfSpeech: "verb",
      definition: "Make something bad less severe, serious, or painful.",
      koreanMeaning: "완화하다, 줄이다",
      exampleSentence: "Regular backups can mitigate the damage caused by a system failure.",
      collocations: ["mitigate risk", "mitigate damage", "mitigate the impact"],
      mnemonic: "Mitt + gate: a big mitt (glove) blocking the gate to stop the damage",
      imagePrompt: "A large shield absorbing the blow of a wrecking ball, cracks in the shield but wall intact",
    },
    {
      word: "pragmatic",
      partOfSpeech: "adjective",
      definition: "Dealing with things sensibly and realistically based on practical considerations.",
      koreanMeaning: "실용적인, 현실적인",
      exampleSentence: "The team took a pragmatic approach and shipped the simplest version first.",
      collocations: ["pragmatic approach", "pragmatic solution", "remain pragmatic"],
      mnemonic: "Prag +matic: a practical magic that focuses on what actually works",
      imagePrompt: "A toolbox with well-worn tools, a to-do list nearby showing crossed-off items",
    },
    {
      word: "redundant",
      partOfSpeech: "adjective",
      definition: "Not or no longer needed; superfluous or unnecessarily repetitive.",
      koreanMeaning: "불필요한, 중복된",
      exampleSentence: "After the merger, several positions became redundant and were eliminated.",
      collocations: ["redundant code", "redundant processes", "made redundant"],
      mnemonic: "Re (again) + dun (done): doing something again that is already done — unnecessary",
      imagePrompt: "Three identical photocopies of a document, two of them stamped UNNECESSARY in red",
    },
    {
      word: "streamline",
      partOfSpeech: "verb",
      definition: "Make a system or organization more efficient by simplifying or eliminating unnecessary steps.",
      koreanMeaning: "간소화하다, 효율화하다",
      exampleSentence: "The new software helped us streamline the onboarding process for new hires.",
      collocations: ["streamline operations", "streamline the process", "streamline workflow"],
      mnemonic: "Stream + line: water flows in a straight line, smooth and fast, no obstacles",
      imagePrompt: "Water flowing in a perfectly straight, fast stream cutting through tangled brush",
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
    console.log(`✓ VocabularyCard ${index + 1}/12: ${card.word}`);
  }

  // 6. Create 8 mock Review VocabularyCard AIArtifacts (previous-day review words)
  const reviewVocabCards = [
    {
      word: "analyze",
      partOfSpeech: "verb",
      definition: "To examine something in detail in order to understand or explain it.",
      koreanMeaning: "분석하다",
      exampleSentence: "We need to analyze the data before making a decision.",
      collocations: ["analyze data", "analyze results", "analyze trends"],
      mnemonic: "Ana + lyze: Ana uses a lens (lyze) to look closely at everything",
      imagePrompt: "A magnifying glass over a complex diagram, details revealed",
      review: true,
    },
    {
      word: "implement",
      partOfSpeech: "verb",
      definition: "To put a plan, decision, or agreement into effect.",
      koreanMeaning: "실행하다, 구현하다",
      exampleSentence: "The company will implement the new policy starting next month.",
      collocations: ["implement a policy", "implement changes", "implement a strategy"],
      mnemonic: "Imp + lement: an imp with a cement mixer building something real",
      imagePrompt: "A blueprint transforming into a finished building with workers",
      review: true,
    },
    {
      word: "collaborate",
      partOfSpeech: "verb",
      definition: "To work jointly with others, especially in an intellectual or creative project.",
      koreanMeaning: "협업하다, 협력하다",
      exampleSentence: "The two departments collaborate closely on product launches.",
      collocations: ["collaborate with", "collaborate on", "closely collaborate"],
      mnemonic: "Co + labor + ate: we ate lunch while co-laboring together",
      imagePrompt: "Two puzzle pieces fitting together perfectly, each half-built",
      review: true,
    },
    {
      word: "acknowledge",
      partOfSpeech: "verb",
      definition: "To accept or admit the existence or truth of something.",
      koreanMeaning: "인정하다, 인식하다",
      exampleSentence: "She acknowledged that the report contained errors.",
      collocations: ["acknowledge a mistake", "acknowledge receipt", "officially acknowledge"],
      mnemonic: "Ack + know + ledge: on the knowledge ledge, you ack (confirm) what you know",
      imagePrompt: "A hand pressing a checkmark button on a glowing screen",
      review: true,
    },
    {
      word: "clarify",
      partOfSpeech: "verb",
      definition: "To make a statement or situation less confused and more clearly comprehensible.",
      koreanMeaning: "명확히 하다, 설명하다",
      exampleSentence: "Could you clarify what you mean by that?",
      collocations: ["clarify a point", "clarify the situation", "please clarify"],
      mnemonic: "Clar + ify: clarity amplified — turn up the clarity dial",
      imagePrompt: "A foggy image becoming crystal clear, split down the middle",
      review: true,
    },
    {
      word: "prioritize",
      partOfSpeech: "verb",
      definition: "To designate something as more important than other things; to deal with it first.",
      koreanMeaning: "우선순위를 정하다",
      exampleSentence: "You need to prioritize your tasks based on deadlines.",
      collocations: ["prioritize tasks", "prioritize needs", "prioritize safety"],
      mnemonic: "Prior + itize: make it prior — put it at the front of the line",
      imagePrompt: "A ranked list with the top item highlighted and glowing",
      review: true,
    },
    {
      word: "evaluate",
      partOfSpeech: "verb",
      definition: "To form an idea of the amount, number, or value of something; to assess.",
      koreanMeaning: "평가하다, 판단하다",
      exampleSentence: "We will evaluate the results after the pilot program ends.",
      collocations: ["evaluate performance", "evaluate options", "evaluate the impact"],
      mnemonic: "E + value + ate: eat the value — digest what something is worth",
      imagePrompt: "A scale balancing two different objects, numbers floating above",
      review: true,
    },
    {
      word: "demonstrate",
      partOfSpeech: "verb",
      definition: "To clearly show the existence or truth of something by giving evidence.",
      koreanMeaning: "증명하다, 보여주다",
      exampleSentence: "The pilot program will demonstrate whether the approach works.",
      collocations: ["demonstrate a skill", "demonstrate value", "demonstrate commitment"],
      mnemonic: "Demo + nstrate: give a demo to show — demonstration is just a live demo",
      imagePrompt: "A presenter pointing to a live working model on stage",
      review: true,
    },
  ];

  for (let index = 0; index < reviewVocabCards.length; index++) {
    const card = reviewVocabCards[index];
    await prisma.aIArtifact.upsert({
      where: { artifactId: `seed-review-${index + 1}` },
      create: {
        artifactId: `seed-review-${index + 1}`,
        userId: user.id,
        dailyLessonId: lesson.id,
        studyDay: 1,
        curriculumVersion: 1,
        difficultyLevel: 2,
        generationSeed: `review-seed-${index + 1}`,
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
    console.log(`✓ Review VocabCard ${index + 1}/${reviewVocabCards.length}: ${card.word}`);
  }

  // 6b. Create 4 more review vocab cards to complete Round 2 (12 total)
  const extraReviewCards = [
    {
      word: "negotiate",
      partOfSpeech: "verb",
      definition: "To discuss something formally in order to reach an agreement.",
      koreanMeaning: "협상하다, 교섭하다",
      exampleSentence: "Both sides need to negotiate a fair deal before the deadline.",
      collocations: ["negotiate a deal", "negotiate terms", "negotiate with"],
      mnemonic: "Neg + go + tiate: negative go — push back until you reach a deal",
      imagePrompt: "Two people shaking hands across a negotiating table with contracts visible",
      review: true,
    },
    {
      word: "articulate",
      partOfSpeech: "verb / adjective",
      definition: "To express an idea or feeling fluently and clearly.",
      koreanMeaning: "명확히 표현하다, 유창한",
      exampleSentence: "She was able to articulate her concerns clearly during the meeting.",
      collocations: ["articulate a vision", "well-articulated", "articulate speaker"],
      mnemonic: "Art + tic + ulate: an artist who tick-talks clearly with every word",
      imagePrompt: "A speaker at a podium with clear speech bubbles forming perfect sentences",
      review: true,
    },
    {
      word: "comprehensive",
      partOfSpeech: "adjective",
      definition: "Including or dealing with all or nearly all elements or aspects of something.",
      koreanMeaning: "포괄적인, 종합적인",
      exampleSentence: "The report provides a comprehensive overview of the market trends.",
      collocations: ["comprehensive plan", "comprehensive review", "comprehensive guide"],
      mnemonic: "Com + pre + hensive: come before you tense — cover everything before stress",
      imagePrompt: "A large map with every region detailed and highlighted in different colors",
      review: true,
    },
    {
      word: "innovative",
      partOfSpeech: "adjective",
      definition: "Featuring new methods; advanced and original.",
      koreanMeaning: "혁신적인, 창의적인",
      exampleSentence: "The startup is known for its innovative approach to customer service.",
      collocations: ["innovative solution", "innovative thinking", "innovative design"],
      mnemonic: "In + nova + tive: a new nova (star) — shining with original ideas",
      imagePrompt: "A light bulb exploding with colorful new ideas radiating outward",
      review: true,
    },
  ];

  for (let index = 0; index < extraReviewCards.length; index++) {
    const card = extraReviewCards[index];
    await prisma.aIArtifact.upsert({
      where: { artifactId: `seed-review-extra-${index + 1}` },
      create: {
        artifactId: `seed-review-extra-${index + 1}`,
        userId: user.id,
        dailyLessonId: lesson.id,
        studyDay: 1,
        curriculumVersion: 1,
        difficultyLevel: 2,
        generationSeed: `review-extra-seed-${index + 1}`,
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
    console.log(`✓ Review VocabCard extra ${index + 1}/4: ${card.word}`);
  }

  // 7. SentenceCard artifacts — Round 1 (12 new) + Round 2 (12 review)
  const newSentenceCards = [
    { sentence: "The new CEO acted as a ___ for the company's rapid transformation.", answer: "catalyst", hint: "Something that speeds up change", translation: "새 CEO는 회사의 빠른 변혁을 위한 촉매제 역할을 했다." },
    { sentence: "We can ___ our existing customer base to grow the new product.", answer: "leverage", hint: "Use to maximum advantage", translation: "기존 고객층을 활용해 신제품을 성장시킬 수 있다." },
    { sentence: "The merger created ___ between the two companies' strengths.", answer: "synergy", hint: "Combined effect greater than the sum of parts", translation: "합병은 두 회사의 강점 사이에 시너지를 만들어냈다." },
    { sentence: "Regular backups can ___ the damage caused by a system failure.", answer: "mitigate", hint: "Make something less severe", translation: "정기적인 백업은 시스템 장애로 인한 피해를 완화할 수 있다." },
    { sentence: "The new platform will ___ collaboration between remote teams.", answer: "facilitate", hint: "Make something easier to do", translation: "새 플랫폼은 원격 팀 간 협업을 촉진할 것이다." },
    { sentence: "We need to ___ the updated procedures by the end of next week.", answer: "implement", hint: "Put something into action", translation: "다음 주 말까지 업데이트된 절차를 시행해야 한다." },
    { sentence: "The consultant helped us ___ the approval process significantly.", answer: "streamline", hint: "Make something more efficient", translation: "컨설턴트는 승인 프로세스를 크게 간소화하는 데 도움을 줬다." },
    { sentence: "Effective leaders know when to ___ tasks to their team members.", answer: "delegate", hint: "Assign responsibility to someone else", translation: "효과적인 리더는 언제 팀원들에게 업무를 위임할지 안다." },
    { sentence: "We must ___ our workflow to meet the growing client demand.", answer: "optimize", hint: "Make something as good as possible", translation: "증가하는 고객 수요를 충족하려면 업무 흐름을 최적화해야 한다." },
    { sentence: "The team decided to ___ their performance against industry leaders.", answer: "benchmark", hint: "Compare against a standard", translation: "팀은 업계 선두 기업을 기준으로 성과를 비교하기로 했다." },
    { sentence: "You must ___ the most critical tasks to meet the deadline.", answer: "prioritize", hint: "Decide the order of importance", translation: "마감을 맞추려면 가장 중요한 작업을 우선시해야 한다." },
    { sentence: "The design and engineering teams will ___ on the new feature.", answer: "collaborate", hint: "Work together on a shared goal", translation: "디자인팀과 엔지니어링팀이 새 기능을 함께 개발할 것이다." },
  ];

  const reviewSentenceCards = [
    { sentence: "The sales team spent weeks trying to ___ better contract terms.", answer: "negotiate", hint: "Discuss to reach an agreement", translation: "영업팀은 더 나은 계약 조건을 협상하기 위해 몇 주를 보냈다.", review: true },
    { sentence: "She was able to ___ her vision clearly to the entire board.", answer: "articulate", hint: "Express something clearly", translation: "그녀는 이사회 전체에 자신의 비전을 명확하게 표현할 수 있었다.", review: true },
    { sentence: "The audit provided a ___ review of all financial records.", answer: "comprehensive", hint: "Including everything important", translation: "감사는 모든 재무 기록에 대한 포괄적인 검토를 제공했다.", review: true },
    { sentence: "We need ___ thinking to break into the competitive Asian market.", answer: "innovative", hint: "New and original ideas", translation: "경쟁이 치열한 아시아 시장에 진출하려면 혁신적인 사고가 필요하다.", review: true },
    { sentence: "The company is committed to ___ business practices across all divisions.", answer: "sustainable", hint: "Can continue long-term without harm", translation: "회사는 모든 부서에 걸쳐 지속 가능한 비즈니스 관행을 이행하기로 했다.", review: true },
    { sentence: "Leadership must be ___ about budget constraints this quarter.", answer: "transparent", hint: "Open and honest, nothing hidden", translation: "경영진은 이번 분기 예산 제약에 대해 투명해야 한다.", review: true },
    { sentence: "She showed great ___ by proposing the automation project herself.", answer: "initiative", hint: "Taking action without being told", translation: "그녀는 자발적으로 자동화 프로젝트를 제안함으로써 큰 주도성을 보였다.", review: true },
    { sentence: "The startup proved ___ despite multiple setbacks during the year.", answer: "resilient", hint: "Able to recover quickly from difficulties", translation: "그 스타트업은 한 해 동안 여러 어려움에도 불구하고 회복력이 있음을 증명했다.", review: true },
    { sentence: "A ___ approach to compliance avoids costly penalties later.", answer: "proactive", hint: "Acting in advance to prevent problems", translation: "규정 준수에 대한 사전 예방적 접근법은 나중에 발생할 비용을 막아준다.", review: true },
    { sentence: "The new structure ensures clear ___ for every major decision.", answer: "accountability", hint: "Responsibility for results", translation: "새 구조는 모든 주요 결정에 대한 명확한 책임 소재를 보장한다.", review: true },
    { sentence: "This ___ tool can handle both data analysis and reporting tasks.", answer: "versatile", hint: "Able to adapt to many uses", translation: "이 다용도 도구는 데이터 분석과 보고 작업을 모두 처리할 수 있다.", review: true },
    { sentence: "The board reached a ___ on the restructuring plan after three days.", answer: "consensus", hint: "General agreement among a group", translation: "이사회는 사흘간의 논의 끝에 구조조정 계획에 대한 합의에 도달했다.", review: true },
  ];

  const allSentenceCards = [...newSentenceCards, ...reviewSentenceCards];

  for (let index = 0; index < allSentenceCards.length; index++) {
    const card = allSentenceCards[index];
    const isReview = index >= newSentenceCards.length;
    const artifactId = isReview
      ? `seed-sentence-review-${index - newSentenceCards.length + 1}`
      : `seed-sentence-${index + 1}`;
    await prisma.aIArtifact.upsert({
      where: { artifactId },
      create: {
        artifactId,
        userId: user.id,
        dailyLessonId: lesson.id,
        studyDay: 1,
        curriculumVersion: 1,
        difficultyLevel: 3,
        generationSeed: `sentence-seed-${index + 1}`,
        modelVersion: "mock-v1",
        promptVersion: "seed-v1",
        validationStatus: ValidationStatus.PASSED,
        validationScore: 0.95,
        safetyStatus: SafetyStatus.SAFE,
        content: card,
        artifactType: ArtifactType.SENTENCE_CARD,
      },
      update: {
        content: card,
        dailyLessonId: lesson.id,
      },
    });
    const label = isReview ? "Review" : "New";
    console.log(`✓ SentenceCard ${label} ${index + 1}/${allSentenceCards.length}: "${card.sentence.slice(0, 40)}..."`);
  }

  // 8. Create 1 mock SpeakingScenario AIArtifact
  const speakingScenario = {
    category: "job_interview",
    title: "Tech Startup Interview",
    learnerRole: "a software engineer applying for a senior position at a growing startup",
    aiRole: "a technical hiring manager evaluating the candidate",
    goal: "Impress the interviewer with your technical knowledge and leadership experience, and negotiate a competitive salary.",
    wildcard: "Halfway through the interview, the manager mentions the role requires 30% international travel — something not in the job posting.",
    openingMessage:
      "Thanks for coming in today. I've reviewed your resume and I'm impressed by your background. Let's start with a brief introduction — can you tell me about your most challenging technical project and what you learned from it?",
    minimumTurns: 8,
  };

  await prisma.aIArtifact.upsert({
    where: { artifactId: "seed-speaking-1" },
    create: {
      artifactId: "seed-speaking-1",
      userId: user.id,
      dailyLessonId: lesson.id,
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: 3,
      generationSeed: "speaking-seed-1",
      modelVersion: "mock-v1",
      promptVersion: "seed-v1",
      validationStatus: ValidationStatus.PASSED,
      validationScore: 0.95,
      safetyStatus: SafetyStatus.SAFE,
      content: speakingScenario,
      artifactType: ArtifactType.SPEAKING_SCENARIO,
    },
    update: {
      content: speakingScenario,
      dailyLessonId: lesson.id,
    },
  });
  console.log(`✓ SpeakingScenario: ${speakingScenario.title}`);

  // 9. Create 1 mock ReadingPassage AIArtifact (6 core questions)
  const readingPassage = {
    title: "The Rise of Remote Work Culture",
    koreanTranslation:
      "원격 근무로의 전 세계적 전환은 현대 비즈니스 환경을 근본적으로 바꿔 놓았습니다. 한때 일부 선택받은 사람들만 누리는 혜택으로 여겨졌던 재택근무는 이제 전 세계 수백만 직원에게 일반적인 근무 방식이 되었습니다. 2020년 팬데믹으로 가속화된 이 변화는 기업들로 하여금 사무실 공간부터 경영 철학까지 모든 것을 재고하도록 만들었습니다.\n\n원격 근무 지지자들은 수많은 장점을 꼽습니다. 직원들은 매일 출퇴근이 없어지고 개인 업무를 더 유연하게 처리할 수 있다는 점에서 높은 직업 만족도를 보고합니다. 연구에 따르면 원격 근무자들은 전통적인 사무실 환경에서보다 방해를 덜 받기 때문에 생산성이 더 높은 경우가 많습니다. 기업 입장에서는 지리적 위치에 관계없이 인재를 채용할 수 있게 되어 채용 가능한 인력 풀이 크게 확대되었습니다.\n\n그러나 이 전환이 순탄하기만 한 것은 아닙니다. 많은 관리자들은 대면 상호작용 없이 팀 결속력을 유지하고 성과를 모니터링하는 데 어려움을 겪습니다. 특히 신입 직원들은 공유 공간에서 자연스럽게 이루어지는 비공식적인 멘토링과 협력 학습의 기회를 놓칠 수 있습니다. 직업과 개인 생활 사이의 경계가 흐려지면서 더 긴 근무 시간으로 이어지고, 역설적이게도 시간이 지남에 따라 삶의 질이 떨어질 수 있습니다.\n\n기업들은 이제 두 방식의 장점을 모두 취하려는 하이브리드 모델을 실험하고 있습니다. 이 방식에서 직원들은 사무실과 원격 근무지를 번갈아 오가며, 협업 프로젝트는 사무실에서, 집중이 필요한 개인 업무는 집에서 처리합니다. 초기 증거에 따르면 잘 설계된 하이브리드 일정은 팀의 사회적 유대감을 유지하면서도 유연성을 제공할 수 있습니다.\n\n이 문화적 전환의 장기적인 영향은 아직 미지수입니다. 분명한 것은 전통적인 9시-5시 사무실 모델이 완전히 되돌아오지는 않을 것이라는 점입니다. 대신, 신중하게 적응하고 올바른 디지털 도구와 경영 방식에 투자하는 기업이 변화하는 업무 환경에서 최고의 인재를 유치하고 유지하는 데 가장 유리한 위치에 있을 것입니다.",
    passage:
      "The global shift toward remote work has fundamentally altered the landscape of modern business. Once considered a perk reserved for a select few, working from home has become the norm for millions of employees worldwide. This transformation, accelerated by the pandemic of 2020, has prompted organizations to rethink everything from office space to management philosophy.\n\nProponents of remote work cite numerous advantages. Employees report higher levels of job satisfaction, citing the elimination of daily commutes and greater flexibility in managing personal responsibilities. Studies suggest that remote workers often demonstrate increased productivity, partly because they experience fewer interruptions than in a traditional office environment. For companies, the ability to hire talent regardless of geographic location has expanded the available workforce significantly.\n\nHowever, the transition has not been without friction. Many managers struggle to maintain team cohesion and monitor performance without face-to-face interaction. Junior employees, in particular, may miss the informal mentorship and collaborative learning that naturally occur in a shared physical space. The boundaries between professional and personal life can blur, leading to longer working hours and, paradoxically, reduced wellbeing over time.\n\nOrganizations are now experimenting with hybrid models that attempt to capture the best of both worlds. Under these arrangements, employees split their time between the office and remote locations, attending the workplace for collaborative projects while handling focused individual tasks from home. Early evidence suggests that well-designed hybrid schedules can preserve the social fabric of a team while still offering flexibility.\n\nThe long-term impact of this cultural shift remains to be seen. What is clear is that the traditional nine-to-five office model will never fully return. Instead, companies that adapt thoughtfully and invest in the right digital tools and management practices will be best positioned to attract and retain top talent in the evolving world of work.",
    wordCount: 430,
    topic: "business / workplace culture",
    difficulty: 3,
    questions: [
      {
        id: "q1",
        questionType: "main_idea",
        question: "What is the main idea of this passage?",
        options: [
          "Remote work has eliminated the need for physical offices entirely.",
          "The shift to remote work has reshaped business practices, bringing both benefits and challenges.",
          "Productivity always increases when employees work from home.",
          "The pandemic permanently ended traditional office culture.",
        ],
        correctIndex: 1,
        explanation:
          "The passage covers both advantages (productivity, talent pool) and challenges (management, mentorship, burnout) of remote work, making B the balanced main idea.",
        evidenceText:
          "This transformation, accelerated by the pandemic of 2020, has prompted organizations to rethink everything from office space to management philosophy.",
      },
      {
        id: "q2",
        questionType: "detail",
        question: "According to the passage, why do remote workers often show increased productivity?",
        options: [
          "They have access to better technology at home.",
          "They work longer hours without breaks.",
          "They experience fewer interruptions than in a traditional office.",
          "They are more motivated by higher salaries.",
        ],
        correctIndex: 2,
        explanation:
          "The passage explicitly states that productivity increases 'partly because they experience fewer interruptions than in a traditional office environment.'",
        evidenceText:
          "Studies suggest that remote workers often demonstrate increased productivity, partly because they experience fewer interruptions than in a traditional office environment.",
      },
      {
        id: "q3",
        questionType: "inference",
        question: "What can be inferred about junior employees in a fully remote setting?",
        options: [
          "They tend to be more productive than senior employees.",
          "They may develop professional skills more slowly without informal in-person mentorship.",
          "They prefer remote work over office work.",
          "They always perform poorly without supervision.",
        ],
        correctIndex: 1,
        explanation:
          "The passage says junior employees 'may miss the informal mentorship and collaborative learning that naturally occur in a shared physical space,' implying slower skill development.",
        evidenceText:
          "Junior employees, in particular, may miss the informal mentorship and collaborative learning that naturally occur in a shared physical space.",
      },
      {
        id: "q4",
        questionType: "vocabulary",
        question: "As used in paragraph 3, what does 'friction' most closely mean?",
        options: [
          "Physical resistance between surfaces",
          "Conflict between coworkers",
          "Difficulty and resistance during a process of change",
          "A type of management strategy",
        ],
        correctIndex: 2,
        explanation:
          "'The transition has not been without friction' uses 'friction' metaphorically to mean obstacles and difficulties experienced during the shift to remote work.",
        evidenceText: "However, the transition has not been without friction.",
      },
      {
        id: "q5",
        questionType: "structure",
        question: "How is the passage organized?",
        options: [
          "Chronological account of events leading to remote work adoption",
          "Problem-solution format proposing a definitive answer",
          "Balanced discussion of benefits and drawbacks followed by an emerging solution",
          "Comparison of two opposing research studies",
        ],
        correctIndex: 2,
        explanation:
          "The passage presents advantages (paragraphs 2), challenges (paragraph 3), a proposed hybrid solution (paragraph 4), and a forward-looking conclusion.",
        evidenceText:
          "Organizations are now experimenting with hybrid models that attempt to capture the best of both worlds.",
      },
      {
        id: "q6",
        questionType: "author_purpose",
        question: "What is the author's likely purpose in writing this passage?",
        options: [
          "To argue that remote work is superior to office work",
          "To provide an objective overview of remote work's impact on business culture",
          "To persuade companies to adopt fully remote models",
          "To criticize organizations that resist remote work",
        ],
        correctIndex: 1,
        explanation:
          "The author presents multiple viewpoints without strong advocacy, aiming to inform readers about the broad implications of remote work culture.",
        evidenceText:
          "The long-term impact of this cultural shift remains to be seen.",
      },
    ],
  };

  await prisma.aIArtifact.upsert({
    where: { artifactId: "seed-reading-1" },
    create: {
      artifactId: "seed-reading-1",
      userId: user.id,
      dailyLessonId: lesson.id,
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: 3,
      generationSeed: "reading-seed-1",
      modelVersion: "mock-v1",
      promptVersion: "seed-v1",
      validationStatus: ValidationStatus.PASSED,
      validationScore: 0.95,
      safetyStatus: SafetyStatus.SAFE,
      content: readingPassage,
      artifactType: ArtifactType.READING_PASSAGE,
    },
    update: {
      content: readingPassage,
      dailyLessonId: lesson.id,
    },
  });
  console.log(`✓ ReadingPassage: "${readingPassage.title}" (6 questions)`);

  // 10. Create 1 mock WritingPrompt AIArtifact
  const writingPrompt = {
    prompt:
      "Your company is considering switching from a fully in-office model to a hybrid work arrangement. Write a short proposal addressed to your manager explaining whether you support or oppose this change. Include at least two specific reasons and suggest one practical step the company should take.",
    context:
      "Many companies are debating hybrid vs. full in-office work policies. A well-structured proposal uses clear reasoning and professional language.",
    targetGrammar: ["conditional sentences (if/unless)", "passive voice", "modal verbs for suggestion (should, could, might)"],
    minimumWords: 180,
    maximumWords: 220,
    sampleOutline:
      "1. State your position clearly. 2. Reason 1 with example. 3. Reason 2 with example. 4. Practical recommendation. 5. Closing statement.",
    difficulty: 3,
  };

  await prisma.aIArtifact.upsert({
    where: { artifactId: "seed-writing-1" },
    create: {
      artifactId: "seed-writing-1",
      userId: user.id,
      dailyLessonId: lesson.id,
      studyDay: 1,
      curriculumVersion: 1,
      difficultyLevel: 3,
      generationSeed: "writing-seed-1",
      modelVersion: "mock-v1",
      promptVersion: "seed-v1",
      validationStatus: ValidationStatus.PASSED,
      validationScore: 0.95,
      safetyStatus: SafetyStatus.SAFE,
      content: writingPrompt,
      artifactType: ArtifactType.WRITING_PROMPT,
    },
    update: {
      content: writingPrompt,
      dailyLessonId: lesson.id,
    },
  });
  console.log(`✓ WritingPrompt: "${writingPrompt.prompt.slice(0, 60)}..."`);

  // 11. Create 5 mock ErrorRecord entries for Error Review
  const errorRecords = [
    {
      domain: "conversation",
      errorType: "grammar",
      content: {
        original: "I am working here since three years.",
        context: "Describing work experience during a job interview",
      },
      feedback:
        'Use the present perfect with "for" to express duration: "I have been working here for three years." The present continuous "I am working" cannot be used with a duration.',
    },
    {
      domain: "reading",
      errorType: "inference_failure",
      content: {
        original: "The author implies that remote workers are always more productive.",
        context: "Reading comprehension — author's purpose question",
      },
      feedback:
        'The passage says remote workers "often demonstrate increased productivity" — not always. Watch for absolute words (always, never, all) in incorrect answer options; the passage uses cautious language.',
    },
    {
      domain: "writing",
      errorType: "vocabulary",
      content: {
        original: "This policy will make a big synergy.",
        context: "Writing task about company policy",
      },
      feedback:
        '"Synergy" is a noun used with "create" or "generate," not "make." Correct usage: "This policy will create synergy between teams." Also note: synergy describes a combined effect, not a general benefit.',
    },
    {
      domain: "conversation",
      errorType: "grammar",
      content: {
        original: "If I will get the job, I will move to Seoul.",
        context: "Discussing future plans in a conversation",
      },
      feedback:
        'In a first conditional sentence, the if-clause uses simple present (not "will"): "If I get the job, I will move to Seoul." Only the main clause uses "will."',
    },
    {
      domain: "reading",
      errorType: "vocabulary",
      content: {
        word: "pragmatic",
        original: "The team took a pragmatic approach — they were very idealistic.",
        context: "Vocabulary question on reading passage",
      },
      feedback:
        '"Pragmatic" means focused on practical results, not idealism. It is actually the opposite of idealistic. Remember: pragmatic = practical + realistic, based on what actually works rather than theory.',
    },
  ];

  for (let index = 0; index < errorRecords.length; index++) {
    const record = errorRecords[index];
    await prisma.errorRecord.upsert({
      where: { id: `seed-error-${index + 1}` },
      create: {
        id: `seed-error-${index + 1}`,
        userId: user.id,
        domain: record.domain,
        errorType: record.errorType,
        content: record.content,
        feedback: record.feedback,
      },
      update: {
        content: record.content,
        feedback: record.feedback,
      },
    });
    console.log(`✓ ErrorRecord ${index + 1}/5: [${record.domain}] ${record.errorType}`);
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
