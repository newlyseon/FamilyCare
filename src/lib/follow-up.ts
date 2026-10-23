// 추적검사 권고의 기한 상태. 검진일 + 권고 개월 수로 기한을 계산한다.
export type FollowUpState = "overdue" | "soon" | "scheduled" | "unknown";

const SOON_DAYS = 60;

export function followUpDue(examDate: string | null, months: number | null) {
  if (!examDate || months == null) return null;
  const [y, m, d] = examDate.split("-").map(Number);
  // 월 단위로 더하되, 31일처럼 없는 날짜는 그달 말일로 맞춘다.
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target;
}

export function followUpState(due: Date | null, now = new Date()): FollowUpState {
  if (!due) return "unknown";
  const days = (due.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= SOON_DAYS) return "soon";
  return "scheduled";
}

export const formatYearMonth = (d: Date) => `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const formatExamDate = (s: string) => s.replaceAll("-", ".");
