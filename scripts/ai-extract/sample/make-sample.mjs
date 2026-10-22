// 가상 인물의 가짜 검진 결과지를 PDF와 PNG로 만든다. 실제 기록이 아니다.
// 추출 정확도를 재기 위한 정답(expected.json)도 함께 쓴다.
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const dir = import.meta.dirname;

const expected = {
  examDate: "2025-11-14",
  institution: "한빛내과의원 건강검진센터",
  items: [
    { name: "혈압", value: "138/86", judgment: "주의" },
    { name: "공복혈당", value: "108", judgment: "주의" },
    { name: "총콜레스테롤", value: "231", judgment: "주의" },
    { name: "LDL 콜레스테롤", value: "162", judgment: "주의" },
    { name: "AST", value: "28", judgment: "정상" },
    { name: "ALT", value: "31", judgment: "정상" },
    { name: "혈청 크레아티닌", value: "0.9", judgment: "정상" },
    { name: "흉부 X선", value: null, judgment: "정상" },
    { name: "위내시경", value: null, judgment: "주의" },
    { name: "대장내시경", value: null, judgment: "추적필요" },
    { name: "갑상선 초음파", value: null, judgment: "추적필요" },
  ],
  followUps: [
    { target: "대장내시경", recommendedMonths: 36 },
    { target: "갑상선 초음파", recommendedMonths: 6 },
  ],
  // 추적 권고로 잘못 분류하면 안 되는 조건부 권고의 핵심어
  conditionalAdvice: ["위염"],
};

const row = (cat, name, value, unit, ref, judgment) =>
  `<tr><td>${cat}</td><td>${name}</td><td>${value}</td><td>${unit}</td><td>${ref}</td><td class="j-${judgment}">${judgment}</td></tr>`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  body { font-family: "Apple SD Gothic Neo", sans-serif; margin: 40px; color: #111; font-size: 13px; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
  .sample { text-align: center; color: #c00; font-weight: 700; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
  th { background: #eee; }
  .meta td:first-child { width: 120px; background: #f6f6f6; }
  .j-주의 { color: #b60; font-weight: 700; } .j-추적필요 { color: #c00; font-weight: 700; }
  .opinion { border: 1px solid #999; padding: 12px; line-height: 1.7; }
</style></head><body>
  <h1>건강검진 결과 통보서</h1>
  <div class="sample">※ 테스트용 샘플 — 가상 인물, 실제 기록 아님</div>
  <table class="meta">
    <tr><td>성명</td><td>김가상 (남, 1952년생)</td></tr>
    <tr><td>검진일</td><td>2025년 11월 14일</td></tr>
    <tr><td>검진기관</td><td>한빛내과의원 건강검진센터</td></tr>
    <tr><td>검진 종류</td><td>일반건강검진 + 암검진 + 선택검사</td></tr>
  </table>
  <table>
    <tr><th>구분</th><th>검사 항목</th><th>결과</th><th>단위</th><th>참고치</th><th>판정</th></tr>
    ${row("계측", "혈압", "138/86", "mmHg", "120/80 미만", "주의")}
    ${row("혈액", "공복혈당", "108", "mg/dL", "100 미만", "주의")}
    ${row("혈액", "총콜레스테롤", "231", "mg/dL", "200 미만", "주의")}
    ${row("혈액", "LDL 콜레스테롤", "162", "mg/dL", "130 미만", "주의")}
    ${row("간기능", "AST", "28", "U/L", "40 이하", "정상")}
    ${row("간기능", "ALT", "31", "U/L", "35 이하", "정상")}
    ${row("신장", "혈청 크레아티닌", "0.9", "mg/dL", "1.5 이하", "정상")}
    ${row("영상", "흉부 X선", "이상 소견 없음", "-", "-", "정상")}
    ${row("암검진", "위내시경", "만성 위염", "-", "-", "주의")}
    ${row("선택", "대장내시경", "선종성 용종 2개 (절제함)", "-", "-", "추적필요")}
    ${row("선택", "갑상선 초음파", "우측 엽 1.2cm 결절", "-", "-", "추적필요")}
  </table>
  <h2 style="font-size:15px">종합 소견</h2>
  <div class="opinion">
    혈압과 공복혈당, 콜레스테롤이 경계 수준으로 생활습관 관리가 필요합니다.<br>
    대장내시경에서 선종성 용종 2개를 절제하였으며, 3년 후 추적 대장내시경을 권합니다.<br>
    갑상선 우측 엽 결절(1.2cm)은 6개월 후 갑상선 초음파로 추적 관찰을 권합니다.<br>
    만성 위염은 증상이 있을 때 진료를 받으시기 바랍니다.
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 820, height: 1100 } });
await page.setContent(html);
await page.pdf({ path: path.join(dir, "sample.pdf"), format: "A4", printBackground: true });
await page.screenshot({ path: path.join(dir, "sample.png"), fullPage: true });
await browser.close();
await writeFile(path.join(dir, "expected.json"), JSON.stringify(expected, null, 2));
console.log("sample.pdf, sample.png, expected.json 생성");
