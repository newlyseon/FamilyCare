"use server";

import { get, head } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { checkupItems, checkups, followUps, members, uploads } from "@/db/schema";
import { confirmedCheckupSchema, type ConfirmedCheckup } from "@/lib/checkup-schema";
import { EXTRACT_MODEL, extractCheckup } from "@/lib/extract";
import { ALLOWED_CONTENT_TYPES, assertDataEnabled } from "@/lib/guard";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// 브라우저가 Blob 업로드를 마친 뒤 호출한다. 파일이 실제로 있는지 확인하고 기록을 만든다.
export async function registerUpload(input: { pathname: string; filename: string; memberId: string }): Promise<Result<{ id: string }>> {
  assertDataEnabled();
  if (!input.pathname.startsWith("uploads/")) return { ok: false, error: "잘못된 경로입니다" };
  if (!/^[0-9a-f-]{36}$/.test(input.memberId)) return { ok: false, error: "누구의 결과지인지 골라 주세요" };
  const member = await getDb().query.members.findFirst({ where: eq(members.id, input.memberId), columns: { id: true } });
  if (!member) return { ok: false, error: "누구의 결과지인지 골라 주세요" };

  const blob = await head(input.pathname).catch(() => null);
  if (!blob) return { ok: false, error: "업로드된 파일을 찾을 수 없습니다" };
  if (!ALLOWED_CONTENT_TYPES.includes(blob.contentType)) return { ok: false, error: "지원하지 않는 파일 형식입니다" };

  const [row] = await getDb()
    .insert(uploads)
    .values({ memberId: member.id, pathname: blob.pathname, filename: input.filename, contentType: blob.contentType, size: blob.size })
    .returning({ id: uploads.id });
  revalidatePath("/");
  return { ok: true, data: { id: row.id } };
}

// 결과지를 AI로 읽어 초안을 저장한다. 20~30초 걸린다.
export async function analyzeUpload(id: string): Promise<Result> {
  assertDataEnabled();
  const db = getDb();
  const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) return { ok: false, error: "업로드를 찾을 수 없습니다" };
  if (upload.status === "analyzing") return { ok: false, error: "이미 분석 중입니다" };
  if (upload.status === "confirmed") return { ok: false, error: "이미 저장된 기록입니다" };

  await db.update(uploads).set({ status: "analyzing", error: null }).where(eq(uploads.id, id));
  try {
    const file = await get(upload.pathname, { access: "private" });
    if (!file || file.statusCode !== 200) throw new Error("원본 파일을 읽을 수 없습니다");
    const bytes = new Uint8Array(await new Response(file.stream).arrayBuffer());

    const { draft, costUsd } = await extractCheckup(bytes, upload.contentType);
    await db
      .update(uploads)
      .set({ status: "ready", draft, model: EXTRACT_MODEL, costUsd, analyzedAt: new Date() })
      .where(eq(uploads.id, id));
    revalidatePath(`/uploads/${id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석에 실패했습니다";
    await db.update(uploads).set({ status: "failed", error: message }).where(eq(uploads.id, id));
    revalidatePath(`/uploads/${id}`);
    return { ok: false, error: message };
  }
}

// 사용자가 확인·수정한 내용을 검진 기록으로 저장한다.
export async function confirmCheckup(id: string, input: ConfirmedCheckup): Promise<Result<{ memberId: string | null }>> {
  assertDataEnabled();
  const parsed = confirmedCheckupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요" };
  const data = parsed.data;

  const db = getDb();
  const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) return { ok: false, error: "업로드를 찾을 수 없습니다" };
  if (upload.status !== "ready") return { ok: false, error: "저장할 수 있는 상태가 아닙니다" };

  await db.transaction(async (tx) => {
    const [checkup] = await tx
      .insert(checkups)
      .values({
        uploadId: id,
        examDate: data.examDate,
        institution: data.institution,
        examType: data.examType,
        conditionalAdvice: data.conditionalAdvice,
      })
      .returning({ id: checkups.id });
    if (data.items.length > 0) {
      await tx.insert(checkupItems).values(data.items.map((item, position) => ({ ...item, checkupId: checkup.id, position })));
    }
    if (data.followUps.length > 0) {
      await tx.insert(followUps).values(data.followUps.map((f) => ({ ...f, checkupId: checkup.id })));
    }
    await tx.update(uploads).set({ status: "confirmed" }).where(eq(uploads.id, id));
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { memberId: upload.memberId } };
}
