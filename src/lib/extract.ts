import "server-only";
import { generateText, Output } from "ai";
import { checkupDraftSchema } from "./checkup-schema";

// AI Gateway 무료 크레딧으로 쓸 수 있는 모델 (2026-10 기준). 정확도 측정은 scripts/ai-extract 참고.
export const EXTRACT_MODEL = "openai/gpt-5-mini";

const system = `너는 건강검진 결과지에서 정보를 옮겨 적는 도구다.
- 결과지에 실제로 적힌 내용만 옮긴다. 추론하거나 채워 넣지 않는다.
- 의학적 해석, 조언, 위험도 판단을 하지 않는다.
- 판정은 결과지에 표기된 것만 쓴다. 표기가 없으면 '기재없음'.
- 추적검사 권고(followUps)는 특정 검사를 정해진 시기에 다시 받으라는 문장만 담는다. 시기는 개월 수로도 바꾼다.
- "증상이 있을 때", "관리가 필요합니다"처럼 시기가 없거나 조건이 붙은 권고는 conditionalAdvice에 담는다.
- 애매하거나 흐린 값은 confidence를 low로 둔다.`;

export async function extractCheckup(file: Uint8Array, mediaType: string) {
  const result = await generateText({
    model: EXTRACT_MODEL,
    system,
    output: Output.object({ schema: checkupDraftSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "이 건강검진 결과지를 스키마에 맞게 옮겨 적어줘." },
          { type: "file", mediaType, data: file },
        ],
      },
    ],
  });
  const gateway = result.providerMetadata?.gateway as { cost?: string } | undefined;
  return { draft: result.output, costUsd: gateway?.cost ?? null };
}
