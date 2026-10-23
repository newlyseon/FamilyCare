"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { assertDataEnabled } from "@/lib/guard";
import { memberFormSchema } from "@/lib/member-schema";

export type MemberFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  // 검증 실패 시 사용자가 입력한 값을 그대로 돌려줘 폼이 비지 않게 한다.
  values?: Record<string, string>;
};

function parse(formData: FormData) {
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = memberFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data } as const;
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { state: { error: "입력값을 확인하세요", fieldErrors, values } } as const;
}

export async function createMember(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  assertDataEnabled();
  const result = parse(formData);
  if (!result.data) return result.state;
  await getDb().insert(members).values(result.data);
  revalidatePath("/");
  redirect("/");
}

export async function updateMember(id: string, _prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  assertDataEnabled();
  const result = parse(formData);
  if (!result.data) return result.state;
  const updated = await getDb()
    .update(members)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(members.id, id))
    .returning({ id: members.id });
  if (updated.length === 0) return { error: "프로필을 찾을 수 없습니다" };
  revalidatePath("/");
  redirect("/");
}
