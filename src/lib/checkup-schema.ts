import { z } from "zod";

export const judgments = ["정상", "주의", "이상", "추적필요", "기재없음"] as const;

const confidence = z.enum(["high", "medium", "low"]).describe("원문에서 읽은 확신 정도. 흐리거나 애매하면 low");

const item = z.object({
  category: z.string().nullable(),
  name: z.string().describe("검사 항목명, 결과지 표기 그대로"),
  value: z.string().nullable().describe("수치 결과. 수치가 아닌 소견만 있으면 null"),
  unit: z.string().nullable(),
  referenceRange: z.string().nullable(),
  finding: z.string().nullable().describe("수치가 아닌 결과 문구(예: 만성 위염)"),
  judgment: z.enum(judgments).describe("결과지에 적힌 판정. 적혀 있지 않으면 기재없음"),
});

const followUp = z.object({
  target: z.string().describe("추적할 검사 이름"),
  reason: z.string().describe("추적 이유, 결과지 문구 기준"),
  recommendedTiming: z.string().describe("권고 시기 원문 그대로(예: 3년 후)"),
  recommendedMonths: z.number().int().nullable().describe("권고 시기를 개월 수로. 연·개월로 바꿀 수 없으면 null"),
  sourceText: z.string().describe("근거가 된 원문 문장"),
});

const conditionalAdvice = z.object({
  advice: z.string().describe("권고 내용, 결과지 문구 기준"),
  condition: z.string().describe("권고가 적용되는 조건(예: 증상이 있을 때)"),
  sourceText: z.string().describe("근거가 된 원문 문장"),
});

const header = {
  examDate: z.string().nullable().describe("검진일 YYYY-MM-DD. 없으면 null"),
  institution: z.string().nullable(),
  examType: z.string().nullable().describe("결과지에 적힌 검진 종류 그대로"),
};

// AI가 만드는 초안: 칸마다 확신 정도를 함께 받는다.
export const checkupDraftSchema = z.object({
  ...header,
  items: z.array(item.extend({ confidence })),
  followUps: z
    .array(followUp)
    .describe("특정 검사를 정해진 시기에 다시 받으라는 권고만. 증상이 있을 때 등 조건부 권고는 conditionalAdvice로"),
  conditionalAdvice: z.array(conditionalAdvice).describe("시기 없이 조건이 붙은 권고, 생활습관 관리 권고"),
  unreadable: z.array(z.string()).describe("읽을 수 없었던 부분"),
});

// 사용자가 확인해 저장하는 기록
export const confirmedCheckupSchema = z.object({
  ...header,
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "검진일은 YYYY-MM-DD 형식이어야 합니다").nullable(),
  items: z.array(item.extend({ name: z.string().trim().min(1, "검사 항목명을 입력하세요") })),
  followUps: z.array(followUp),
  conditionalAdvice: z.array(conditionalAdvice),
});

export type CheckupDraft = z.infer<typeof checkupDraftSchema>;
export type ConfirmedCheckup = z.infer<typeof confirmedCheckupSchema>;
export type ConditionalAdvice = z.infer<typeof conditionalAdvice>;
