import { registerMock } from "@/lib/ai/mock-registry";
import type { ReadingPassage } from "./types";

const MOCK_READING_PASSAGE: ReadingPassage = {
  title: "The Rise of Remote Work",
  topic: "workplace communication",
  difficulty: 3,
  wordCount: 425,
  passage: `The global shift to remote work, accelerated by the pandemic of 2020, has fundamentally transformed how organizations operate. What began as an emergency measure has evolved into a permanent fixture of the modern workplace, raising profound questions about productivity, collaboration, and work-life balance.

Remote work offers undeniable advantages. Employees save hours previously lost to commuting, reclaiming time for personal pursuits or additional work. Studies suggest that many workers report higher satisfaction when given flexibility over their schedules. Companies, meanwhile, have discovered they can recruit talent without geographic constraints, opening access to a global pool of skilled professionals.

However, the challenges are equally significant. Collaboration, once as simple as walking to a colleague's desk, now requires careful coordination across time zones and digital platforms. The informal conversations that spark creative ideas — the hallway encounters and spontaneous coffee meetings — are difficult to replicate virtually. New employees, in particular, struggle to absorb company culture and build relationships without physical proximity.

Mental health presents another concern. The boundary between professional and personal life blurs when one's home becomes one's office. Some workers report feelings of isolation, while others find it difficult to disconnect from work responsibilities. Managers, too, face new demands: how does one evaluate performance when you cannot observe daily behavior?

Organizations are responding with hybrid models that blend remote and in-office work. These arrangements attempt to preserve the flexibility employees value while maintaining the collaborative benefits of shared physical space. Success depends on clear communication, mutual trust, and technology that genuinely supports — rather than merely simulates — productive teamwork.

The future of work will not look like the past. Forward-thinking companies are redesigning office spaces as collaboration hubs rather than daily workstations, investing in digital infrastructure, and training managers to lead distributed teams effectively. Those who adapt thoughtfully to this new reality will attract and retain the best talent in an increasingly competitive market.`,
  questions: [
    {
      id: "q1",
      questionType: "main_idea",
      question: "What is the main idea of this passage?",
      options: [
        "Remote work was invented during the 2020 pandemic",
        "Remote work has both benefits and challenges that organizations must navigate",
        "All companies should immediately switch to fully remote models",
        "Technology is the only obstacle to successful remote work",
      ],
      correctIndex: 1,
      explanation: "The passage presents a balanced view of remote work's advantages and challenges, concluding that adaptation is key.",
      evidenceText: "What began as an emergency measure has evolved into a permanent fixture of the modern workplace, raising profound questions about productivity, collaboration, and work-life balance.",
    },
    {
      id: "q2",
      questionType: "detail",
      question: "According to the passage, what advantage does remote work offer companies?",
      options: [
        "Lower technology costs",
        "Access to a global talent pool without geographic limits",
        "Elimination of all office expenses",
        "Guaranteed employee productivity",
      ],
      correctIndex: 1,
      explanation: "The passage explicitly states companies can recruit globally without geographic constraints.",
      evidenceText: "Companies, meanwhile, have discovered they can recruit talent without geographic constraints, opening access to a global pool of skilled professionals.",
    },
    {
      id: "q3",
      questionType: "inference",
      question: "What can be inferred about new employees working remotely?",
      options: [
        "They prefer remote work to office environments",
        "They are more productive than experienced employees",
        "They face unique difficulties integrating into company culture",
        "They require less training than in-office employees",
      ],
      correctIndex: 2,
      explanation: "The passage notes that new employees specifically struggle with culture absorption and relationship building without physical proximity.",
      evidenceText: "New employees, in particular, struggle to absorb company culture and build relationships without physical proximity.",
    },
    {
      id: "q4",
      questionType: "vocabulary",
      question: "As used in paragraph 3, what does 'replicate' most nearly mean?",
      options: ["destroy", "reproduce", "improve", "analyze"],
      correctIndex: 1,
      explanation: "'Replicate' means to make an exact copy or reproduce something. Here it describes recreating informal interactions virtually.",
      evidenceText: "The informal conversations that spark creative ideas — the hallway encounters and spontaneous coffee meetings — are difficult to replicate virtually.",
    },
    {
      id: "q5",
      questionType: "structure",
      question: "How does the author organize the passage?",
      options: [
        "Chronological order of remote work's history",
        "Problem and solution only",
        "Benefits followed by challenges, then a forward-looking conclusion",
        "Comparison of two opposing viewpoints only",
      ],
      correctIndex: 2,
      explanation: "The passage moves from advantages (paragraph 2) to challenges (paragraphs 3-4) to solutions and future outlook (paragraphs 5-6).",
      evidenceText: "Remote work offers undeniable advantages... However, the challenges are equally significant... Organizations are responding...",
    },
    {
      id: "q6",
      questionType: "author_purpose",
      question: "What is the author's primary purpose in writing this passage?",
      options: [
        "To argue that remote work is superior to office work",
        "To present a balanced analysis of remote work's impact on organizations",
        "To criticize companies that require office attendance",
        "To explain the history of work from a sociological perspective",
      ],
      correctIndex: 1,
      explanation: "The author presents multiple perspectives without strongly advocating for one position, aiming to inform rather than persuade.",
      evidenceText: "Those who adapt thoughtfully to this new reality will attract and retain the best talent in an increasingly competitive market.",
    },
  ],
};

export function registerReadingMocks(): void {
  for (let level = 1; level <= 5; level++) {
    registerMock(`reading:${level}`, MOCK_READING_PASSAGE);
  }
}
