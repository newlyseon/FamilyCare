// 검진 결과지(PDF/이미지)를 AI로 읽어 구조화된 초안을 만드는 프로토타입.
// 사용: node --env-file=.env.local scripts/ai-extract/extract.mjs <파일> [모델]
import { generateText, Output } from "ai";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";

const file = process.argv[2];
const model = process.argv[3] ?? "openai/gpt-5-mini";
if (!file) {
  console.error("사용법: extract.mjs <결과지 파일> [모델]");
  process.exit(1);
}

const mediaTypes = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const mediaType = mediaTypes[path.extname(file).toLowerCase()];
if (!mediaType) throw new Error(`지원하지 않는 형식: ${file}`);

const confidence = z.enum(["high", "medium", "low"]).describe("원문에서 읽은 확신 정도. 흐리거나 애매하면 low");

export const checkupSchema = z.object({
  examDate: z.string().nullable().describe("검진일 YYYY-MM-DD. 없으면 null"),
  institution: z.string().nullable(),
  examType: z.string().nullable().describe("결과지에 적힌 검진 종류 그대로"),
  items: z.array(
    z.object({
      category: z.string().nullable(),
      name: z.string().describe("검사 항목명, 결과지 표기 그대로"),
      value: z.string().nullable().describe("수치 결과. 수치가 아닌 소견만 있으면 null"),
      unit: z.string().nullable(),
      referenceRange: z.string().nullable(),
      finding: z.string().nullable().describe("수치가 아닌 결과 문구(예: 만성 위염)"),
      judgment: z.enum(["정상", "주의", "이상", "추적필요", "기재없음"]).describe("결과지에 적힌 판정. 적혀 있지 않으면 기재없음"),
      confidence,
    }),
  ),
  followUps: z
    .array(
      z.object({
        target: z.string().describe("추적할 검사 이름"),
        reason: z.string().describe("추적 이유, 결과지 문구 기준"),
        recommendedTiming: z.string().describe("권고 시기 원문 그대로(예: 3년 후)"),
        recommendedMonths: z.number().nullable().describe("권고 시기를 개월 수로. 연·개월로 바꿀 수 없으면 null"),
        sourceText: z.string().describe("근거가 된 원문 문장"),
      }),
    )
    .describe("특정 검사를 정해진 시기에 다시 받으라는 권고만. 증상이 있을 때 등 조건부 권고는 conditionalAdvice로"),
  conditionalAdvice: z
    .array(
      z.object({
        advice: z.string().describe("권고 내용, 결과지 문구 기준"),
        condition: z.string().describe("권고가 적용되는 조건(예: 증상이 있을 때)"),
        sourceText: z.string().describe("근거가 된 원문 문장"),
      }),
    )
    .describe("시기 없이 조건이 붙은 권고, 생활습관 관리 권고"),
  unreadable: z.array(z.string()).describe("읽을 수 없었던 부분"),
});

const system = `너는 건강검진 결과지에서 정보를 옮겨 적는 도구다.
- 결과지에 실제로 적힌 내용만 옮긴다. 추론하거나 채워 넣지 않는다.
- 의학적 해석, 조언, 위험도 판단을 하지 않는다.
- 판정은 결과지에 표기된 것만 쓴다. 표기가 없으면 '기재없음'.
- 추적검사 권고(followUps)는 특정 검사를 정해진 시기에 다시 받으라는 문장만 담는다. 시기는 개월 수로도 바꾼다.
- "증상이 있을 때", "관리가 필요합니다"처럼 시기가 없거나 조건이 붙은 권고는 conditionalAdvice에 담는다.
- 애매하거나 흐린 값은 confidence를 low로 둔다.`;

const started = Date.now();
const result = await generateText({
  model,
  system,
  output: Output.object({ schema: checkupSchema }),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "이 건강검진 결과지를 스키마에 맞게 옮겨 적어줘." },
        { type: "file", mediaType, data: await readFile(file) },
      ],
    },
  ],
});

console.log(JSON.stringify(result.output, null, 2));
console.error(
  JSON.stringify(
    {
      model,
      ms: Date.now() - started,
      usage: result.usage,
      gateway: result.providerMetadata?.gateway,
    },
    null,
    2,
  ),
);
