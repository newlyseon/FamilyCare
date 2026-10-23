// F-06 올해 검진 판정, F-07 판정 근거.
// 흐름은 요구사항 정의서 4장: 대상 조건 → 추적 권고(의사 권고 우선) → 마지막 검사일 + 기본 주기 → 올해까지 받아야 하는가.

import { followUpDue, formatExamDate, formatYearMonth } from "@/lib/follow-up";
import { type ScreeningRule, type ScreeningSubject, screeningRules } from "./rules";

export type HistoryItem = { name: string; judgment: string; value: string | null; unit: string | null };
export type HistoryFollowUp = { target: string; recommendedTiming: string; recommendedMonths: number | null; sourceText: string };
export type HistoryCheckup = { examDate: string | null; items: HistoryItem[]; follows: HistoryFollowUp[] };

export type VerdictCategory = "required" | "recommended" | "check" | "skip" | "na";

export type Verdict = {
  id: string;
  title: string;
  category: VerdictCategory;
  overdue: boolean;
  // 목록에 보이는 이유 한 줄
  summary: string;
  // 펼치면 보이는 판정 근거 (F-07)
  reasons: string[];
  nextYear?: number;
  source?: string;
};

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const matchesRule = (rule: ScreeningRule, name: string) => rule.keywords.some((k) => normalize(name).includes(normalize(k)));
const sameTarget = (a: string, b: string) => normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a));

function seoulYear(now: Date) {
  return Number(now.toLocaleString("en-US", { timeZone: "Asia/Seoul", year: "numeric" }));
}

function addMonths(examDate: string, months: number) {
  return followUpDue(examDate, months)!;
}

export function judgeScreenings(subject: ScreeningSubject, history: HistoryCheckup[], now = new Date()): Verdict[] {
  const year = seoulYear(now);
  const endOfYear = new Date(Date.UTC(year, 11, 31));
  const age = year - subject.birthYear;
  // 검진일이 있는 기록만, 최근 것부터
  const dated = history.filter((c): c is HistoryCheckup & { examDate: string } => Boolean(c.examDate)).sort((a, b) => b.examDate.localeCompare(a.examDate));
  const verdicts: Verdict[] = [];

  const decide = (due: Date) => (due.getTime() <= endOfYear.getTime() ? "required" : "skip");

  for (const rule of screeningRules) {
    const elig = rule.eligibility(subject, age);
    if (elig.eligible === false) {
      verdicts.push({ id: rule.key, title: rule.title, category: "na", overdue: false, summary: elig.reason, reasons: [`대상 조건: ${elig.reason}`], source: rule.source });
      continue;
    }
    const reasons = [elig.eligible === true ? `대상 조건: ${elig.reason}` : `대상 조건: ${elig.reason}`, `기본 주기: ${rule.cycleLabel} (${rule.method})`];
    if (elig.eligible === "unknown") {
      verdicts.push({ id: rule.key, title: rule.title, category: "check", overdue: false, summary: elig.reason, reasons, source: rule.source });
      continue;
    }

    const lastDone = dated.find((c) => c.items.some((i) => matchesRule(rule, i.name)));
    const followCheckup = dated.find((c) => c.follows.some((f) => matchesRule(rule, f.target)));
    const follow = followCheckup?.follows.find((f) => matchesRule(rule, f.target));
    if (lastDone) reasons.push(`마지막 검사: ${formatExamDate(lastDone.examDate)}`);

    // 의사의 추적 권고가 그 뒤에 받은 같은 검사로 대체되지 않았다면 기본 주기보다 우선한다.
    if (follow && followCheckup && (!lastDone || followCheckup.examDate >= lastDone.examDate)) {
      reasons.push(`의사 권고: ${follow.recommendedTiming} (${formatExamDate(followCheckup.examDate)} 결과지)`);
      if (follow.recommendedMonths == null) {
        verdicts.push({ id: rule.key, title: rule.title, category: "check", overdue: false, summary: `권고 시기를 알 수 없어요 · ${follow.recommendedTiming}`, reasons, source: rule.source });
        continue;
      }
      const due = addMonths(followCheckup.examDate, follow.recommendedMonths);
      reasons.push(`다음 검사 시기: ${formatYearMonth(due)} (의사 권고가 기본 주기보다 우선)`);
      const category = decide(due);
      const overdue = due.getTime() < now.getTime();
      verdicts.push({
        id: rule.key,
        title: rule.title,
        category,
        overdue,
        summary: category === "required" ? `${follow.recommendedTiming} 추적 권고 · ${formatYearMonth(due)}${overdue ? "까지였어요" : "까지"}` : `${follow.recommendedTiming} 재검 권고 · 다음 ${due.getUTCFullYear()}`,
        reasons,
        nextYear: category === "skip" ? due.getUTCFullYear() : undefined,
        source: rule.source,
      });
      continue;
    }

    if (!lastDone) {
      reasons.push("받은 기록: 없음");
      verdicts.push({ id: rule.key, title: rule.title, category: "required", overdue: false, summary: `${rule.cycleLabel} · 받은 기록이 없어요`, reasons, source: rule.source });
      continue;
    }
    const due = addMonths(lastDone.examDate, rule.cycleMonths);
    reasons.push(`다음 검사 시기: ${formatYearMonth(due)} (마지막 검사 + ${rule.cycleLabel.replace("마다", "")})`);
    const category = decide(due);
    verdicts.push({
      id: rule.key,
      title: rule.title,
      category,
      overdue: false,
      summary: category === "required" ? `${rule.cycleLabel} · ${formatExamDate(lastDone.examDate).slice(0, 4)}년에 받음` : `${rule.cycleLabel} · ${formatExamDate(lastDone.examDate).slice(0, 4)}년에 받음 · 다음 ${due.getUTCFullYear()}`,
      reasons,
      nextYear: category === "skip" ? due.getUTCFullYear() : undefined,
      source: rule.source,
    });
  }

  // 국가검진에 없는 추적 권고 (예: 갑상선 초음파). 같은 검사를 그 뒤에 받았으면 끝난 것으로 본다.
  const seen = new Set<string>();
  for (const c of dated) {
    for (const f of c.follows) {
      if (screeningRules.some((r) => matchesRule(r, f.target))) continue;
      const key = normalize(f.target);
      if (seen.has(key)) continue;
      seen.add(key);
      const doneLater = dated.some((later) => later.examDate > c.examDate && later.items.some((i) => sameTarget(i.name, f.target)));
      if (doneLater) continue;
      const reasons = [`의사 권고: ${f.recommendedTiming} (${formatExamDate(c.examDate)} 결과지)`, `결과지 문장: ${f.sourceText}`];
      if (f.recommendedMonths == null) {
        verdicts.push({ id: `follow-${key}`, title: f.target, category: "check", overdue: false, summary: `권고 시기를 알 수 없어요 · ${f.recommendedTiming}`, reasons });
        continue;
      }
      const due = addMonths(c.examDate, f.recommendedMonths);
      reasons.push(`다음 검사 시기: ${formatYearMonth(due)}`);
      const category = decide(due);
      const overdue = due.getTime() < now.getTime();
      verdicts.push({
        id: `follow-${key}`,
        title: f.target,
        category,
        overdue,
        summary: category === "required" ? `${f.recommendedTiming} 추적 권고 · ${formatYearMonth(due)}${overdue ? "까지였어요" : "까지"}` : `${f.recommendedTiming} 추적 권고 · 다음 ${due.getUTCFullYear()}`,
        reasons,
        nextYear: category === "skip" ? due.getUTCFullYear() : undefined,
      });
    }
  }

  // 권장: 가장 최근 검진에서 주의·이상 판정을 받은 수치. 개선됐는지 다시 확인한다.
  const latest = dated[0];
  if (latest) {
    for (const i of latest.items) {
      if (i.judgment !== "주의" && i.judgment !== "이상") continue;
      // 숫자로 다시 잴 수 있는 수치만 넣는다. "만성 위염" 같은 소견이나 암검진 항목(위내시경 등)은 위의 판정이 다룬다.
      if (!i.value || !/\d/.test(i.value)) continue;
      if (screeningRules.some((r) => r.key !== "general" && matchesRule(r, i.name))) continue;
      verdicts.push({
        id: `recheck-${normalize(i.name)}`,
        title: i.name,
        category: "recommended",
        overdue: false,
        summary: `${latest.examDate.slice(0, 4)}년 ${[i.value, i.unit].filter(Boolean).join(" ")} (${i.judgment}) · 개선됐는지 확인`,
        reasons: [`${formatExamDate(latest.examDate)} 결과: ${[i.value, i.unit].filter(Boolean).join(" ")}, 판정 ${i.judgment}`, "일반건강검진 혈액·계측 검사에서 함께 확인할 수 있어요"],
      });
    }
  }

  const order: Record<VerdictCategory, number> = { required: 0, check: 1, recommended: 2, skip: 3, na: 4 };
  return verdicts.sort((a, b) => order[a.category] - order[b.category] || Number(b.overdue) - Number(a.overdue));
}
