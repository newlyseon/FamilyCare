import type { UploadStatus } from "@/db/schema";

export const statusLabel: Record<UploadStatus, string> = {
  uploaded: "분석 대기",
  analyzing: "분석 중",
  ready: "확인 필요",
  failed: "분석 실패",
  confirmed: "저장됨",
};
