// 공단(건강iN) 검진결과 자동 조회 실험용 정찰 스크립트.
// 로그인(간편인증)은 사람이 브라우저에서 직접 한다. 스크립트는 인증 정보를 입력하거나 저장하지 않는다.
// 결과 화면의 HTML·스크린샷과 그 사이 오간 응답을 out/에 저장해, 파서 설계에 쓴다.
// out/에는 실제 건강 정보가 담기므로 git에 올리지 않는다(.gitignore).
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import path from "node:path";

const START_URL = "https://www.nhis.or.kr/nhis/index.do";
const OUT_DIR = path.join(import.meta.dirname, "out", new Date().toISOString().replace(/[:.]/g, "-"));

await mkdir(OUT_DIR, { recursive: true });

// 사용자의 평소 Chrome 프로필과 분리된 새 세션으로 연다.
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({ locale: "ko-KR" });
const page = await context.newPage();

const responses = [];
context.on("response", async (res) => {
  const type = res.request().resourceType();
  if (type !== "xhr" && type !== "fetch" && type !== "document") return;
  if (!new URL(res.url()).hostname.endsWith("nhis.or.kr")) return;
  try {
    responses.push({
      at: new Date().toISOString(),
      type,
      method: res.request().method(),
      status: res.status(),
      url: res.url(),
      contentType: res.headers()["content-type"] ?? "",
      body: await res.text(),
    });
  } catch {
    // 리다이렉트 등 본문이 없는 응답은 건너뛴다.
  }
});

await page.goto(START_URL);

console.log(`
[정찰 시작] 열린 Chrome 창에서 직접 진행하세요.
  1. 로그인 → 간편인증 (부모님 휴대폰에서 승인)
  2. 건강검진 결과 조회 화면으로 이동 (연도별 결과를 하나씩 열어도 됩니다)
터미널에서 Enter = 지금 화면 저장, q + Enter = 종료
저장 위치: ${OUT_DIR}
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
let n = 0;
while (true) {
  const answer = await rl.question(`[${n}] Enter=저장, q=종료 > `);
  if (answer.trim().toLowerCase() === "q") break;

  const active = context.pages().at(-1) ?? page;
  const prefix = path.join(OUT_DIR, String(n).padStart(2, "0"));
  await active.screenshot({ path: `${prefix}-screen.png`, fullPage: true });
  const frames = await Promise.all(
    active.frames().map(async (f) => ({ url: f.url(), html: await f.content().catch(() => "") })),
  );
  await writeFile(`${prefix}-page.json`, JSON.stringify({ url: active.url(), title: await active.title(), frames }, null, 2));
  console.log(`  저장함: ${active.url()} (프레임 ${frames.length}개)`);
  n++;
}

await writeFile(path.join(OUT_DIR, "responses.json"), JSON.stringify(responses, null, 2));
console.log(`응답 ${responses.length}건 저장. 종료합니다.`);
rl.close();
await browser.close();
