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

// F-11: 추가검사 결과까지 반영한 추적 권고의 현재 상태
export type FollowUpResult = { testedOn: string; outcome: "clear" | "continue" | "treatment"; nextMonths: number | null };
export type EffectiveFollowUp =
  | { status: "open"; due: Date | null; state: FollowUpState; basis: "recommendation" | "result" }
  | { status: "resolved"; resolvedOn: string }
  | { status: "treatment"; testedOn: string };

export const outcomeLabel: Record<FollowUpResult["outcome"], string> = {
  clear: "이상 없음",
  continue: "추적 계속",
  treatment: "치료 필요",
};

export function latestResult<T extends FollowUpResult>(results: T[]) {
  return results.reduce<T | null>((acc, r) => (!acc || r.testedOn >= acc.testedOn ? r : acc), null);
}

export function effectiveFollowUp(examDate: string | null, months: number | null, results: FollowUpResult[], now = new Date()): EffectiveFollowUp {
  const last = latestResult(results);
  if (last?.outcome === "clear") return { status: "resolved", resolvedOn: last.testedOn };
  if (last?.outcome === "treatment") return { status: "treatment", testedOn: last.testedOn };
  if (last?.outcome === "continue") {
    const due = followUpDue(last.testedOn, last.nextMonths);
    return { status: "open", due, state: followUpState(due, now), basis: "result" };
  }
  const due = followUpDue(examDate, months);
  return { status: "open", due, state: followUpState(due, now), basis: "recommendation" };
}
