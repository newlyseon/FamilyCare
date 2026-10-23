import "server-only";

export const ALLOWED_CONTENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// 로그인이 붙기 전까지 프로덕션에서는 건강 데이터를 다루는 기능(부모님 프로필, 업로드, AI 분석)을 막는다.
// 누구나 공개 주소로 기록을 보거나 파일을 올리고 AI 크레딧을 쓰는 것을 막기 위함이다.
export function dataEnabled() {
  return process.env.VERCEL_ENV !== "production" || process.env.UPLOADS_ENABLED === "true";
}

export function assertDataEnabled() {
  if (!dataEnabled()) {
    throw new Error("프로덕션에서는 이 기능이 꺼져 있습니다. 로그인 기능을 붙인 뒤 켭니다.");
  }
}
