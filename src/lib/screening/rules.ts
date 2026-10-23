// F-08 검진 항목 기준 데이터.
// 국가암검진 기준: 금천구 보건소 국가암검진 안내 (2024-06-21 수정)
// https://www.geumcheon.go.kr/health/contents.do?key=4319
// 기준이 바뀌면 이 파일과 요구사항 정의서 5장을 함께 고친다.

import type { Sex, Smoking } from "@/db/schema";

export type ScreeningSubject = {
  birthYear: number;
  sex: Sex;
  smoking: Smoking;
  packYears: number | null;
  liverHighRisk: boolean;
};

export type Eligibility = { eligible: true; reason: string } | { eligible: false; reason: string } | { eligible: "unknown"; reason: string };

export type ScreeningRule = {
  key: string;
  title: string;
  method: string;
  cycleMonths: number;
  cycleLabel: string;
  // 결과지 항목명이나 추적 권고 대상에 이 말이 들어 있으면 이 검진으로 본다.
  keywords: string[];
  eligibility: (s: ScreeningSubject, age: number) => Eligibility;
  source: string;
};

const NATIONAL_CANCER_SOURCE = "국가암검진 기준 (금천구 보건소 안내, 2024-06-21 수정)";

export const screeningRules: ScreeningRule[] = [
  {
    key: "general",
    title: "일반건강검진",
    method: "신체계측, 혈압, 혈액검사 등",
    cycleMonths: 24,
    cycleLabel: "2년마다",
    keywords: ["혈압", "공복혈당", "콜레스테롤", "크레아티닌", "AST", "ALT", "신체계측"],
    eligibility: () => ({ eligible: true, reason: "성인 대상" }),
    source: "일반건강검진 기준 (주기는 확인 필요: 비사무직은 1년)",
  },
  {
    key: "stomach",
    title: "위암 검진",
    method: "위내시경",
    cycleMonths: 24,
    cycleLabel: "2년마다",
    keywords: ["위내시경", "위장조영", "위암"],
    eligibility: (_, age) => (age >= 40 ? { eligible: true, reason: `${age}세 (40세 이상)` } : { eligible: false, reason: "40세 미만" }),
    source: NATIONAL_CANCER_SOURCE,
  },
  {
    key: "colorectal",
    title: "대장암 검진",
    method: "분변잠혈검사, 이상 시 대장내시경",
    cycleMonths: 12,
    cycleLabel: "1년마다",
    keywords: ["분변잠혈", "대장내시경", "대장암"],
    eligibility: (_, age) => (age >= 50 ? { eligible: true, reason: `${age}세 (50세 이상)` } : { eligible: false, reason: "50세 미만" }),
    source: NATIONAL_CANCER_SOURCE,
  },
  {
    key: "liver",
    title: "간암 검진",
    method: "간초음파 + 혈청알파태아단백검사",
    cycleMonths: 6,
    cycleLabel: "6개월마다",
    keywords: ["간초음파", "간 초음파", "알파태아", "AFP", "간암"],
    eligibility: (s, age) => {
      if (age < 40) return { eligible: false, reason: "40세 미만" };
      return s.liverHighRisk
        ? { eligible: true, reason: `${age}세 · 간암 고위험군 (간경변증 또는 B형·C형 간염)` }
        : { eligible: false, reason: "간암 고위험군이 아님" };
    },
    source: NATIONAL_CANCER_SOURCE,
  },
  {
    key: "breast",
    title: "유방암 검진",
    method: "유방촬영술",
    cycleMonths: 24,
    cycleLabel: "2년마다",
    keywords: ["유방촬영", "유방암", "맘모그래피"],
    eligibility: (s, age) => {
      if (s.sex !== "female") return { eligible: false, reason: "여성 대상" };
      return age >= 40 ? { eligible: true, reason: `${age}세 여성 (40세 이상)` } : { eligible: false, reason: "40세 미만" };
    },
    source: NATIONAL_CANCER_SOURCE,
  },
  {
    key: "cervical",
    title: "자궁경부암 검진",
    method: "자궁경부세포검사",
    cycleMonths: 24,
    cycleLabel: "2년마다",
    keywords: ["자궁경부", "세포검사", "자궁경부암"],
    eligibility: (s, age) => {
      if (s.sex !== "female") return { eligible: false, reason: "여성 대상" };
      return age >= 20 ? { eligible: true, reason: `${age}세 여성 (20세 이상)` } : { eligible: false, reason: "20세 미만" };
    },
    source: NATIONAL_CANCER_SOURCE,
  },
  {
    key: "lung",
    title: "폐암 검진",
    method: "저선량 흉부 CT",
    cycleMonths: 24,
    cycleLabel: "2년마다",
    keywords: ["저선량", "흉부 CT", "흉부CT", "폐암"],
    eligibility: (s, age) => {
      if (age < 54 || age > 74) return { eligible: false, reason: "54~74세 대상" };
      if (s.smoking === "never") return { eligible: false, reason: "흡연 이력 없음" };
      if (s.packYears == null) return { eligible: "unknown", reason: "흡연량(갑년)을 입력하면 대상인지 알 수 있어요" };
      return s.packYears >= 30
        ? { eligible: true, reason: `${age}세 · 흡연 ${s.packYears}갑년 (30갑년 이상)` }
        : { eligible: false, reason: `흡연 ${s.packYears}갑년 (30갑년 미만)` };
    },
    source: `${NATIONAL_CANCER_SOURCE}. 현재 흡연 여부 조건은 확인 필요`,
  },
];
