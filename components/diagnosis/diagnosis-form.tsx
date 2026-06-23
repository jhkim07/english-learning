"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveDiagnosis } from "@/app/(app)/diagnosis/actions";

type Step = 1 | 2 | 3;

const LEVEL_OPTIONS = [
  { value: 1, label: "초급", description: "기초 문법과 단어를 배우는 단계" },
  { value: 2, label: "초중급", description: "간단한 회화가 가능한 단계" },
  { value: 3, label: "중급", description: "일상 대화가 어느 정도 가능한 단계" },
  { value: 4, label: "중고급", description: "복잡한 주제로 대화 가능한 단계" },
  { value: 5, label: "고급", description: "원어민 수준에 가까운 단계" },
];

const GOAL_OPTIONS = [
  { value: "비즈니스 영어", label: "비즈니스 / 직장" },
  { value: "학술 영어", label: "학술 / 연구" },
  { value: "여행 영어", label: "여행 / 일상" },
  { value: "시험 준비", label: "시험 준비 (TOEIC, TOEFL 등)" },
  { value: "전반적 향상", label: "전반적인 실력 향상" },
];

const DAILY_TARGET_OPTIONS = [
  { value: 30, label: "30분", description: "가볍게 시작" },
  { value: 50, label: "50분", description: "표준 (권장)" },
];

interface DiagnosisFormProps {
  userId: string;
}

export function DiagnosisForm({ userId }: DiagnosisFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [level, setLevel] = useState<number | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [dailyTarget, setDailyTarget] = useState<number>(50);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!level || !goal) return;
    startTransition(async () => {
      await saveDiagnosis({
        userId,
        level,
        goal,
        dailyTarget,
        answers: { level, goal, dailyTarget },
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-1 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <CardTitle className="text-lg">
          {step === 1 && "현재 영어 수준은?"}
          {step === 2 && "학습 목표는?"}
          {step === 3 && "하루 학습 시간은?"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {step === 1 &&
          LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLevel(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                level === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-sm text-muted-foreground">{opt.description}</div>
            </button>
          ))}

        {step === 2 &&
          GOAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGoal(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                goal === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
            </button>
          ))}

        {step === 3 &&
          DAILY_TARGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDailyTarget(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                dailyTarget === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-sm text-muted-foreground">{opt.description}</div>
            </button>
          ))}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={isPending}
              className="flex-1"
            >
              이전
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !level) || (step === 2 && !goal)}
              className="flex-1"
            >
              다음
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending || !level || !goal}
              className="flex-1"
            >
              {isPending ? "저장 중..." : "학습 시작"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
