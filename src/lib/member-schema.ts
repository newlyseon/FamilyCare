import { z } from "zod";
import type { Sex, Smoking } from "@/db/schema";

export const sexLabel: Record<Sex, string> = { male: "남성", female: "여성" };
export const smokingLabel: Record<Smoking, string> = { never: "피운 적 없음", former: "과거에 피움", current: "지금 피움" };

// 국가검진은 출생연도 기준이라 연 나이(올해 − 출생연도)를 쓴다.
export function ageThisYear(birthYear: number, now = new Date()) {
  const year = Number(now.toLocaleString("en-US", { timeZone: "Asia/Seoul", year: "numeric" }));
  return year - birthYear;
}

const optionalText = z
  .string()
  .trim()
  .max(500, "500자 이내로 입력하세요")
  .optional()
  .transform((s) => (s ? s : null));

export const memberFormSchema = z
  .object({
    name: z.string().trim().min(1, "호칭을 입력하세요").max(20, "호칭은 20자 이내로 입력하세요"),
    sex: z.enum(["male", "female"], { error: "성별을 고르세요" }),
    birthYear: z
      .string()
      .trim()
      .min(1, "출생연도를 입력하세요")
      .transform(Number)
      .pipe(z.number({ error: "출생연도를 숫자로 입력하세요" }).int("출생연도를 숫자로 입력하세요")
      .min(1900, "출생연도를 확인하세요")
      .max(new Date().getFullYear(), "출생연도를 확인하세요")),
    smoking: z.enum(["never", "former", "current"], { error: "흡연 이력을 고르세요" }),
    packYears: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s ? Number(s) : null))
      .pipe(z.number().int("갑년은 정수로 입력하세요").min(0).max(200, "갑년을 확인하세요").nullable()),
    liverHighRisk: z.literal("on").optional().transform((v) => v === "on"),
    familyHistory: optionalText,
    conditions: optionalText,
  })
  // 비흡연자는 갑년을 저장하지 않는다.
  .transform((m) => ({ ...m, packYears: m.smoking === "never" ? null : m.packYears }));

export type MemberFormValues = z.input<typeof memberFormSchema>;
