"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmCheckup } from "@/app/actions";
import { judgments, type CheckupDraft } from "@/lib/checkup-schema";

type Item = CheckupDraft["items"][number];
type FollowUp = CheckupDraft["followUps"][number];

const input = "w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700";
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
      else router.refresh();
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
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200">
        AI가 정리한 초안입니다. 왼쪽 원본과 비교해 틀린 곳을 고친 뒤 저장하세요.
        {uncertain > 0 && ` 노란 칸 ${uncertain}개는 AI가 확신하지 못한 항목입니다.`}
      </p>

      {draft.unreadable.length > 0 && (
        <div className="rounded-lg border border-amber-300 p-3 text-sm">
          <p className="font-semibold">AI가 읽지 못한 부분</p>
          <ul className="mt-1 list-disc pl-5">
            {draft.unreadable.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-zinc-500">검진일 (YYYY-MM-DD)</span>
          <input className={input} value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="2025-11-14" />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-500">검진기관</span>
          <input className={input} value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </label>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">검사 항목 {items.length}개</h2>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={i}
              className={`rounded-lg border p-3 ${item.confidence === "high" ? "border-zinc-200 dark:border-zinc-800" : "border-amber-400 bg-amber-50 dark:bg-amber-950"}`}
            >
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                <input aria-label="항목명" className={input} value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                <input aria-label="수치" className={input} value={item.value ?? ""} placeholder="수치" onChange={(e) => updateItem(i, { value: orNull(e.target.value) })} />
                <input aria-label="단위" className={input} value={item.unit ?? ""} placeholder="단위" onChange={(e) => updateItem(i, { unit: orNull(e.target.value) })} />
                <select aria-label="판정" className={input} value={item.judgment} onChange={(e) => updateItem(i, { judgment: e.target.value as Item["judgment"] })}>
                  {judgments.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex gap-2">
                <input aria-label="소견" className={input} value={item.finding ?? ""} placeholder="소견 (수치가 아닌 결과)" onChange={(e) => updateItem(i, { finding: orNull(e.target.value) })} />
                <button type="button" className="shrink-0 text-sm text-red-600" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-3 text-sm text-blue-600 underline" onClick={() => setItems((prev) => [...prev, emptyItem])}>
          + 항목 추가
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">추적검사 권고 {follows.length}개</h2>
        {follows.length === 0 && <p className="text-zinc-500">찾은 추적검사 권고가 없습니다.</p>}
        <ul className="space-y-3">
          {follows.map((f, i) => (
            <li key={i} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                <input aria-label="추적 검사" className={input} value={f.target} onChange={(e) => updateFollow(i, { target: e.target.value })} />
                <input aria-label="권고 시기" className={input} value={f.recommendedTiming} onChange={(e) => updateFollow(i, { recommendedTiming: e.target.value })} />
                <input
                  aria-label="개월 수"
                  className={input}
                  inputMode="numeric"
                  value={f.recommendedMonths ?? ""}
                  placeholder="개월"
                  onChange={(e) => updateFollow(i, { recommendedMonths: e.target.value === "" ? null : Number.parseInt(e.target.value, 10) || null })}
                />
              </div>
              <p className="mt-2 text-sm text-zinc-500">원문: {f.sourceText}</p>
              <button type="button" className="mt-1 text-sm text-red-600" onClick={() => setFollows((prev) => prev.filter((_, j) => j !== i))}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>

      {advice.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">조건부 권고</h2>
          <p className="mb-2 text-sm text-zinc-500">시기가 정해지지 않은 권고라 올해 검진 판정에는 쓰지 않습니다.</p>
          <ul className="space-y-2">
            {advice.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <span>{a.sourceText}</span>
                <button type="button" className="shrink-0 text-sm text-red-600" onClick={() => setAdvice((prev) => prev.filter((_, j) => j !== i))}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 border-t border-zinc-200 bg-[var(--background)] py-3 dark:border-zinc-800">
        {error && (
          <p role="alert" className="mb-2 text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60">
          {pending ? "저장하는 중…" : "확인했어요, 저장"}
        </button>
      </div>
    </form>
  );
}
