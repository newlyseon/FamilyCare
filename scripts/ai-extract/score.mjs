// 추출 결과(JSON)를 정답(expected.json)과 비교해 정확도를 센다.
// 사용: node scripts/ai-extract/score.mjs <추출 결과 json>
import { readFile } from "node:fs/promises";
import path from "node:path";

const got = JSON.parse(await readFile(process.argv[2], "utf8"));
const want = JSON.parse(await readFile(path.join(import.meta.dirname, "sample", "expected.json"), "utf8"));
const norm = (s) => (s ?? "").replace(/\s+/g, "").toLowerCase();

const checks = [
  ["검진일", got.examDate === want.examDate],
  ["기관", norm(got.institution) === norm(want.institution)],
];
for (const w of want.items) {
  const g = got.items.find((i) => norm(i.name) === norm(w.name));
  checks.push([`${w.name} 찾음`, Boolean(g)]);
  if (!g) continue;
  if (w.value !== null) checks.push([`${w.name} 수치`, norm(g.value) === norm(w.value)]);
  checks.push([`${w.name} 판정`, g.judgment === w.judgment]);
}
for (const w of want.followUps) {
  const g = got.followUps.find((f) => norm(f.target).includes(norm(w.target)));
  checks.push([`추적 ${w.target}`, g?.recommendedMonths === w.recommendedMonths]);
}
checks.push(["추적 권고 개수", got.followUps.length === want.followUps.length]);
for (const word of want.conditionalAdvice) {
  const inAdvice = got.conditionalAdvice.some((a) => a.sourceText.includes(word) || a.advice.includes(word));
  checks.push([`조건부 권고 ${word}`, inAdvice]);
}

const failed = checks.filter(([, ok]) => !ok);
console.log(`정확도 ${checks.length - failed.length}/${checks.length}`);
for (const [name] of failed) console.log(`  틀림: ${name}`);
console.log(
  `추가로 뽑힌 항목 ${got.items.length - want.items.length}개, 추적 권고 ${got.followUps.length}개, 조건부 권고 ${got.conditionalAdvice.length}개`,
);
