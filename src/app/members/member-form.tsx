"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { members } from "@/db/schema";
import { sexLabel, smokingLabel } from "@/lib/member-schema";
import type { MemberFormState } from "./actions";

type Member = typeof members.$inferSelect;
type Action = (prev: MemberFormState, formData: FormData) => Promise<MemberFormState>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function MemberForm({ action, member, submitLabel, next }: { action: Action; member?: Member; submitLabel: string; next?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  // React는 액션이 끝나면 폼을 초기화하므로, 검증 실패 시 돌려받은 값으로 입력칸을 다시 그린다.
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Fields key={state.values ? JSON.stringify(state.values) : "initial"} state={state} member={member} pending={pending} submitLabel={submitLabel} cancelHref={next ?? "/members"} />
    </form>
  );
}

function Fields({ state, member, pending, submitLabel, cancelHref }: { state: MemberFormState; member?: Member; pending: boolean; submitLabel: string; cancelHref: string }) {
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const [smoking, setSmoking] = useState(v?.smoking ?? member?.smoking ?? "never");

  return (
    <>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="name">호칭</Label>
        <Input id="name" name="name" defaultValue={v?.name ?? member?.name ?? ""} placeholder="예: 아버지" aria-invalid={!!e.name} />
        <FieldError message={e.name} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">성별</legend>
        <RadioGroup name="sex" defaultValue={v?.sex ?? member?.sex} className="flex gap-6" aria-invalid={!!e.sex}>
          {Object.entries(sexLabel).map(([value, label]) => (
            <Label key={value} className="flex items-center gap-2 text-base font-normal">
              <RadioGroupItem value={value} />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <FieldError message={e.sex} />
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="birthYear">출생연도</Label>
        <Input
          id="birthYear"
          name="birthYear"
          inputMode="numeric"
          defaultValue={v?.birthYear ?? member?.birthYear ?? ""}
          placeholder="예: 1952"
          className="max-w-40"
          aria-invalid={!!e.birthYear}
        />
        <p className="text-sm text-muted-foreground">국가검진 대상 연도를 정하는 데 씁니다.</p>
        <FieldError message={e.birthYear} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">흡연 이력</legend>
        <RadioGroup name="smoking" value={smoking} onValueChange={setSmoking} className="grid gap-3 sm:flex sm:gap-6">
          {Object.entries(smokingLabel).map(([value, label]) => (
            <Label key={value} className="flex items-center gap-2 text-base font-normal">
              <RadioGroupItem value={value} />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <FieldError message={e.smoking} />
      </fieldset>

      {smoking !== "never" && (
        <div className="grid gap-1.5">
          <Label htmlFor="packYears">흡연량 (갑년, 선택)</Label>
          <Input
            id="packYears"
            name="packYears"
            inputMode="numeric"
            defaultValue={v?.packYears ?? member?.packYears ?? ""}
            placeholder="예: 30"
            className="max-w-40"
            aria-invalid={!!e.packYears}
          />
          <p className="text-sm text-muted-foreground">하루 갑 수 × 피운 햇수. 폐암 검진 대상(30갑년 이상)을 확인하는 데 씁니다.</p>
          <FieldError message={e.packYears} />
        </div>
      )}
      {smoking === "never" && <input type="hidden" name="packYears" value="" />}

      <Label className="flex items-start gap-3 text-base font-normal">
        <Checkbox name="liverHighRisk" defaultChecked={v ? v.liverHighRisk === "on" : member?.liverHighRisk} className="mt-1" />
        <span>
          간경변증이 있거나 B형·C형 간염 보유자다
          <span className="block text-sm text-muted-foreground">간암 검진(6개월마다) 대상인지 확인하는 데 씁니다.</span>
        </span>
      </Label>

      <div className="grid gap-1.5">
        <Label htmlFor="familyHistory">가족력 (선택)</Label>
        <Textarea id="familyHistory" name="familyHistory" defaultValue={v?.familyHistory ?? member?.familyHistory ?? ""} placeholder="예: 형제 중 대장암" />
        <FieldError message={e.familyHistory} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="conditions">기저질환·복용 중인 약 (선택)</Label>
        <Textarea id="conditions" name="conditions" defaultValue={v?.conditions ?? member?.conditions ?? ""} placeholder="예: 고혈압 약 복용" />
        <FieldError message={e.conditions} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {pending && <LoaderCircle className="animate-spin" />}
          {submitLabel}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={cancelHref}>취소</Link>
        </Button>
      </div>
    </>
  );
}
