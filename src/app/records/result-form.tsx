"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { addFollowUpResult, type ResultFormState } from "@/app/follow-ups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { outcomeLabel } from "@/lib/follow-up";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

function Form({ followUpId, onDone }: { followUpId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ResultFormState, FormData>(addFollowUpResult.bind(null, followUpId), {});
  const [outcome, setOutcome] = useState("");
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="mt-3 space-y-4 rounded-lg bg-muted p-3" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor={`tested-${followUpId}`}>검사한 날짜</Label>
        <Input id={`tested-${followUpId}`} name="testedOn" type="date" defaultValue={today()} max={today()} className="max-w-48 bg-background" />
        {e.testedOn && <p className="text-sm text-destructive">{e.testedOn}</p>}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">결과</legend>
        <RadioGroup name="outcome" value={outcome} onValueChange={setOutcome} className="grid gap-3 sm:flex sm:gap-6">
          {Object.entries(outcomeLabel).map(([value, label]) => (
            <Label key={value} className="flex items-center gap-2 text-base font-normal">
              <RadioGroupItem value={value} className="bg-background" />
              {label}
            </Label>
          ))}
        </RadioGroup>
        {e.outcome && <p className="text-sm text-destructive">{e.outcome}</p>}
      </fieldset>

      {outcome === "continue" && (
        <div className="grid gap-1.5">
          <Label htmlFor={`next-${followUpId}`}>다음 검사까지 (개월)</Label>
          <Input id={`next-${followUpId}`} name="nextMonths" inputMode="numeric" placeholder="예: 6" className="max-w-32 bg-background" />
          <p className="text-sm text-muted-foreground">의사가 말한 다음 검사 시기예요. 모르면 비워 두세요.</p>
          {e.nextMonths && <p className="text-sm text-destructive">{e.nextMonths}</p>}
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`hospital-${followUpId}`}>병원 (선택)</Label>
        <Input id={`hospital-${followUpId}`} name="hospital" placeholder="예: 동네 내과" className="bg-background" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`memo-${followUpId}`}>메모 (선택)</Label>
        <Textarea id={`memo-${followUpId}`} name="memo" placeholder="예: 결절 크기 변화 없음" className="bg-background" />
        {e.memo && <p className="text-sm text-destructive">{e.memo}</p>}
      </div>

      {state.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          결과 저장
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}

// 추적검사 카드 안의 "결과 입력" 버튼. 누르면 입력 폼이 펼쳐진다.
export function ResultFormToggle({ followUpId, label = "추적검사 결과 입력" }: { followUpId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  if (!open) {
    return (
      <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <Form
      key={round}
      followUpId={followUpId}
      onDone={() => {
        setOpen(false);
        setRound((r) => r + 1);
      }}
    />
  );
}
