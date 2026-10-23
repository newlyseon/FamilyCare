"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmCheckup } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { judgments, type CheckupDraft } from "@/lib/checkup-schema";
import { cn } from "@/lib/utils";

type Item = CheckupDraft["items"][number];
type FollowUp = CheckupDraft["followUps"][number];

const emptyItem: Item = {
  category: null,
  name: "",
  value: null,
  unit: null,
  referenceRange: null,
  finding: null,
  judgment: "기재없음",
  confidence: "high",
};

const orNull = (s: string) => (s.trim() === "" ? null : s);

export function ReviewForm({ uploadId, draft }: { uploadId: string; draft: CheckupDraft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [examDate, setExamDate] = useState(draft.examDate ?? "");
  const [institution, setInstitution] = useState(draft.institution ?? "");
  const [items, setItems] = useState<Item[]>(draft.items);
  const [follows, setFollows] = useState<FollowUp[]>(draft.followUps);
  const [advice, setAdvice] = useState(draft.conditionalAdvice);
  const uncertain = items.filter((i) => i.confidence !== "high").length;

  const updateItem = (index: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateFollow = (index: number, patch: Partial<FollowUp>) =>
    setFollows((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await confirmCheckup(uploadId, {
        examDate: orNull(examDate),
        institution: orNull(institution),
        examType: draft.examType,
        // confidence는 검토용이라 서버의 스키마 검증에서 걸러지고 저장되지 않는다.
        items,
        followUps: follows,
        conditionalAdvice: advice,
      });
      if (!result.ok) setError(result.error);
      // 저장하면 업로드 화면이 아니라 그 부모님의 홈으로 돌아가 결과를 바로 보여준다.
      else router.push(result.data.memberId ? `/?member=${result.data.memberId}&saved=1` : "/records");
    });
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Alert variant="info">
        <AlertDescription>
          AI가 정리한 초안입니다. 원본과 비교해 틀린 곳을 고친 뒤 저장하세요.
          {uncertain > 0 && ` 노란 칸 ${uncertain}개는 AI가 확신하지 못한 항목입니다.`}
        </AlertDescription>
      </Alert>

      {draft.unreadable.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>AI가 읽지 못한 부분</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {draft.unreadable.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="exam-date">검진일 (YYYY-MM-DD)</Label>
          <Input id="exam-date" value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="2025-11-14" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="institution">검진기관</Label>
          <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">검사 항목 {items.length}개</h2>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i}>
              <Card className={cn("gap-2 py-3", item.confidence !== "high" && "bg-warning ring-warning-foreground/40")}>
                <CardContent className="space-y-2 px-3">
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                    <Input aria-label="항목명" value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                    <Input aria-label="수치" value={item.value ?? ""} placeholder="수치" onChange={(e) => updateItem(i, { value: orNull(e.target.value) })} />
                    <Input aria-label="단위" value={item.unit ?? ""} placeholder="단위" onChange={(e) => updateItem(i, { unit: orNull(e.target.value) })} />
                    <Select value={item.judgment} onValueChange={(v) => updateItem(i, { judgment: v as Item["judgment"] })}>
                      <SelectTrigger aria-label="판정" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {judgments.map((j) => (
                          <SelectItem key={j} value={j}>
                            {j}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input aria-label="소견" value={item.finding ?? ""} placeholder="소견 (수치가 아닌 결과)" onChange={(e) => updateItem(i, { finding: orNull(e.target.value) })} />
                    <Button type="button" variant="ghost" size="icon" aria-label={`${item.name || "항목"} 삭제`} onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" className="mt-3" onClick={() => setItems((prev) => [...prev, emptyItem])}>
          <Plus />
          항목 추가
        </Button>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">추적검사 권고 {follows.length}개</h2>
        {follows.length === 0 && <p className="text-muted-foreground">찾은 추적검사 권고가 없습니다.</p>}
        <ul className="space-y-3">
          {follows.map((f, i) => (
            <li key={i}>
              <Card className="gap-2 py-3">
                <CardContent className="space-y-2 px-3">
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <Input aria-label="추적 검사" value={f.target} onChange={(e) => updateFollow(i, { target: e.target.value })} />
                    <Input aria-label="권고 시기" value={f.recommendedTiming} onChange={(e) => updateFollow(i, { recommendedTiming: e.target.value })} />
                    <Input
                      aria-label="개월 수"
                      inputMode="numeric"
                      value={f.recommendedMonths ?? ""}
                      placeholder="개월"
                      onChange={(e) => updateFollow(i, { recommendedMonths: e.target.value === "" ? null : Number.parseInt(e.target.value, 10) || null })}
                    />
                    <Button type="button" variant="ghost" size="icon" aria-label={`${f.target} 권고 삭제`} onClick={() => setFollows((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">원문: {f.sourceText}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {advice.length > 0 && (
        <section>
          <h2 className="mb-1 font-heading text-lg font-semibold">조건부 권고</h2>
          <p className="mb-3 text-sm text-muted-foreground">시기가 정해지지 않은 권고라 올해 검진 판정에는 쓰지 않습니다.</p>
          <ul className="space-y-2">
            {advice.map((a, i) => (
              <li key={i}>
                <Card className="py-3">
                  <CardContent className="flex items-start justify-between gap-3 px-3">
                    <span>{a.sourceText}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label="조건부 권고 삭제" onClick={() => setAdvice((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 border-t border-border bg-background py-3">
        {error && (
          <p role="alert" className="mb-2 text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending && <LoaderCircle className="animate-spin" />}
          {pending ? "저장하는 중…" : "확인했어요, 저장"}
        </Button>
      </div>
    </form>
  );
}
