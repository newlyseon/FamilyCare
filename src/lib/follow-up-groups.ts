import type { getMemberHistory } from "@/lib/queries";
import { effectiveFollowUp } from "./follow-up";

export type History = Awaited<ReturnType<typeof getMemberHistory>>;
type Follow = History[number]["follows"][number];
export type FollowUpRow = { follow: Follow; examDate: string | null; eff: ReturnType<typeof effectiveFollowUp>; doneLater: string | null };

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// F-09: 부모님의 추적 권고를 지금 확인 / 정기 추적 / 해결 완료로 나눈다.
export function groupFollowUps(history: History) {
  const rows: FollowUpRow[] = [];
  for (const c of history) {
    for (const f of c.follows) {
      // 그 뒤 검진에서 같은 검사를 받았으면 끝난 것으로 본다.
      const later = history.find(
        (x) => x.examDate && c.examDate && x.examDate > c.examDate && x.items.some((i) => normalize(i.name).includes(normalize(f.target)) || normalize(f.target).includes(normalize(i.name))),
      );
      rows.push({ follow: f, examDate: c.examDate, eff: effectiveFollowUp(c.examDate, f.recommendedMonths, f.results), doneLater: later?.examDate ?? null });
    }
  }
  const now = rows.filter((r) => !r.doneLater && (r.eff.status === "treatment" || (r.eff.status === "open" && r.eff.state !== "scheduled")));
  const scheduled = rows.filter((r) => !r.doneLater && r.eff.status === "open" && r.eff.state === "scheduled");
  const done = rows.filter((r) => r.doneLater || r.eff.status === "resolved");
  return { now, scheduled, done };
}

