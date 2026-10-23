import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { checkupItems, checkups, followUps, members, uploads } from "@/db/schema";

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
