import { describe, expect, it } from "vitest";
import { judgeScreenings, type HistoryCheckup } from "./judge";
import type { ScreeningSubject } from "./rules";

// 가짜 샘플 결과지(scripts/ai-extract/sample)와 같은 내용
const sample2025: HistoryCheckup = {
  examDate: "2025-11-14",
  items: [
    { name: "혈압", judgment: "주의", value: "138/86", unit: "mmHg" },
    { name: "공복혈당", judgment: "주의", value: "108", unit: "mg/dL" },
    { name: "LDL 콜레스테롤", judgment: "주의", value: "162", unit: "mg/dL" },
    { name: "AST", judgment: "정상", value: "28", unit: "U/L" },
    { name: "위내시경", judgment: "주의", value: null, unit: null },
    { name: "대장내시경", judgment: "추적필요", value: null, unit: null },
    { name: "갑상선 초음파", judgment: "추적필요", value: null, unit: null },
  ],
  follows: [
    { target: "대장내시경", recommendedTiming: "3년 후", recommendedMonths: 36, sourceText: "3년 후 추적 대장내시경을 권합니다." },
    { target: "갑상선 초음파", recommendedTiming: "6개월 후", recommendedMonths: 6, sourceText: "6개월 후 갑상선 초음파로 추적 관찰을 권합니다." },
  ],
};

const father: ScreeningSubject = { birthYear: 1952, sex: "male", smoking: "former", packYears: 35, liverHighRisk: false };
const now = new Date("2026-10-23T03:00:00Z");
const byId = (vs: ReturnType<typeof judgeScreenings>) => Object.fromEntries(vs.map((v) => [v.id, v]));

describe("judgeScreenings", () => {
  const v = byId(judgeScreenings(father, [sample2025], now));

  it("의사의 추적 권고가 기본 주기보다 우선한다 (대장내시경 3년 후 → 2028)", () => {
    expect(v.colorectal.category).toBe("skip");
    expect(v.colorectal.nextYear).toBe(2028);
  });

  it("주기가 아직 안 된 검진은 건너뛴다 (위내시경 2025 + 2년 → 2027)", () => {
    expect(v.stomach.category).toBe("skip");
    expect(v.stomach.nextYear).toBe(2027);
    expect(v.general.category).toBe("skip");
  });

  it("국가검진에 없는 추적 권고도 기한을 계산하고, 지났으면 필수 + 기한 지남", () => {
    const thyroid = Object.values(v).find((x) => x.title === "갑상선 초음파");
    expect(thyroid?.category).toBe("required");
    expect(thyroid?.overdue).toBe(true);
  });

  it("대상이지만 받은 기록이 없으면 필수 (폐암: 74세, 35갑년)", () => {
    expect(v.lung.category).toBe("required");
    expect(v.lung.reasons.join(" ")).toContain("받은 기록: 없음");
  });

  it("대상 조건이 안 되면 해당 없음 (남성의 유방암·자궁경부암, 고위험 아닌 간암)", () => {
    expect(v.breast.category).toBe("na");
    expect(v.cervical.category).toBe("na");
    expect(v.liver.category).toBe("na");
  });

  it("주의 판정 수치는 권장으로 넣고, 수치가 없는 소견은 넣지 않는다", () => {
    const recommended = Object.values(v).filter((x) => x.category === "recommended").map((x) => x.title);
    expect(recommended).toEqual(["혈압", "공복혈당", "LDL 콜레스테롤"]);
  });

  it("수치 칸에 소견 문구가 들어간 암검진 항목은 권장에 넣지 않는다", () => {
    const messy: HistoryCheckup = { ...sample2025, items: [...sample2025.items, { name: "위내시경", judgment: "주의", value: "만성 위염", unit: null }] };
    const recommended = judgeScreenings(father, [messy], now).filter((x) => x.category === "recommended").map((x) => x.title);
    expect(recommended).not.toContain("위내시경");
  });

  it("흡연량을 모르면 폐암 대상 여부는 확인 필요", () => {
    const r = byId(judgeScreenings({ ...father, packYears: null }, [sample2025], now));
    expect(r.lung.category).toBe("check");
  });

  it("추적 권고 뒤에 같은 검사를 받았으면 그 권고는 끝난 것으로 본다", () => {
    const later: HistoryCheckup = { examDate: "2026-06-01", items: [{ name: "갑상선 초음파", judgment: "정상", value: null, unit: null }], follows: [] };
    const r = judgeScreenings(father, [sample2025, later], now);
    expect(r.find((x) => x.title === "갑상선 초음파")).toBeUndefined();
  });

  it("권고 시기를 알 수 없는 추적 권고는 확인 필요", () => {
    const vague: HistoryCheckup = { ...sample2025, follows: [{ target: "갑상선 초음파", recommendedTiming: "추후", recommendedMonths: null, sourceText: "추후 추적 관찰" }] };
    const thyroid = judgeScreenings(father, [vague], now).find((x) => x.title === "갑상선 초음파");
    expect(thyroid?.category).toBe("check");
  });

  it("여성 60세는 유방암·자궁경부암 대상이고 기록이 없으면 필수", () => {
    const mother: ScreeningSubject = { birthYear: 1966, sex: "female", smoking: "never", packYears: null, liverHighRisk: false };
    const r = byId(judgeScreenings(mother, [], now));
    expect(r.breast.category).toBe("required");
    expect(r.cervical.category).toBe("required");
    expect(r.lung.category).toBe("na");
  });
});
