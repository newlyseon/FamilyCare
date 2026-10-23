"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { followUpResults, followUps } from "@/db/schema";
import { assertDataEnabled } from "@/lib/guard";

export type ResultFormState = { ok?: boolean; error?: string; fieldErrors?: Partial<Record<string, string>> };

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

const schema = z
  .object({
    testedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "검사한 날짜를 고르세요")
      .refine((d) => d <= today(), "오늘 이후 날짜는 입력할 수 없어요"),
    outcome: z.enum(["clear", "continue", "treatment"], { error: "결과를 고르세요" }),
    nextMonths: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s ? Number(s) : null))
      .pipe(z.number().int("개월 수는 정수로 입력하세요").min(1, "1개월 이상으로 입력하세요").max(120, "120개월 이하로 입력하세요").nullable()),
    hospital: z.string().trim().max(100).optional().transform((s) => s || null),
    memo: z.string().trim().max(500, "메모는 500자 이내로 입력하세요").optional().transform((s) => s || null),
  })
  // 다음 권고 시기는 "추적 계속"일 때만 의미가 있다.
  .transform((v) => ({ ...v, nextMonths: v.outcome === "continue" ? v.nextMonths : null }));

// F-10: 추적 권고에 대한 추가검사 결과를 기록한다.
export async function addFollowUpResult(followUpId: string, _prev: ResultFormState, formData: FormData): Promise<ResultFormState> {
  assertDataEnabled();
  if (!/^[0-9a-f-]{36}$/.test(followUpId)) return { error: "추적 항목을 찾을 수 없어요" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { error: "입력값을 확인하세요", fieldErrors };
  }
  const db = getDb();
  const follow = await db.query.followUps.findFirst({ where: eq(followUps.id, followUpId), columns: { id: true } });
  if (!follow) return { error: "추적 항목을 찾을 수 없어요" };
  await db.insert(followUpResults).values({ followUpId, ...parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}
