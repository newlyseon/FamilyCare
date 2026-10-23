import "server-only";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { checkupItems, checkups, followUpResults, followUps, members, uploads } from "@/db/schema";

export const getMembers = () => getDb().select().from(members).orderBy(asc(members.createdAt));

// 홈의 첫 방문 / 다시 방문을 가르는 기준: 저장(확인)까지 마친 검진이 하나라도 있는가
export async function hasConfirmedCheckup() {
  const [row] = await getDb()
    .select({ id: checkups.id })
    .from(checkups)
    .innerJoin(uploads, eq(checkups.uploadId, uploads.id))
    .where(isNotNull(uploads.memberId))
    .limit(1);
  return Boolean(row);
}

// 검토만 남은 결과지 (AI 분석은 끝났지만 아직 저장하지 않음)
export async function getPendingReviews() {
  return getDb()
    .select({ id: uploads.id, filename: uploads.filename, memberName: members.name })
    .from(uploads)
    .leftJoin(members, eq(uploads.memberId, members.id))
    .where(eq(uploads.status, "ready"))
    .orderBy(desc(uploads.createdAt));
}

// 부모님 한 분의 가장 최근 검진(검진일 기준)과 그 항목·추적 권고
export async function getLatestCheckup(memberId: string) {
  const db = getDb();
  const [latest] = await db
    .select({ checkup: checkups, uploadId: uploads.id })
    .from(checkups)
    .innerJoin(uploads, eq(checkups.uploadId, uploads.id))
    .where(and(eq(uploads.memberId, memberId)))
    .orderBy(desc(checkups.examDate), desc(checkups.createdAt))
    .limit(1);
  if (!latest) return null;
  const [items, follows] = await Promise.all([
    db.select().from(checkupItems).where(eq(checkupItems.checkupId, latest.checkup.id)).orderBy(asc(checkupItems.position)),
    db.select().from(followUps).where(eq(followUps.checkupId, latest.checkup.id)),
  ]);
  return { ...latest.checkup, uploadId: latest.uploadId, items, follows };
}

// 판정(F-06)에 쓰는 부모님의 전체 검진 이력
export async function getMemberHistory(memberId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: checkups.id, examDate: checkups.examDate })
    .from(checkups)
    .innerJoin(uploads, eq(checkups.uploadId, uploads.id))
    .where(eq(uploads.memberId, memberId));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [items, follows] = await Promise.all([
    db.select().from(checkupItems).where(inArray(checkupItems.checkupId, ids)),
    db.select().from(followUps).where(inArray(followUps.checkupId, ids)),
  ]);
  const results = follows.length
    ? await db.select().from(followUpResults).where(inArray(followUpResults.followUpId, follows.map((f) => f.id)))
    : [];
  return rows.map((r) => ({
    id: r.id,
    examDate: r.examDate,
    items: items.filter((i) => i.checkupId === r.id).sort((a, b) => a.position - b.position),
    follows: follows
      .filter((f) => f.checkupId === r.id)
      .map((f) => ({ ...f, results: results.filter((x) => x.followUpId === f.id) })),
  }));
}
