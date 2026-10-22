import type { UploadStatus } from "@/db/schema";

export const statusLabel: Record<UploadStatus, string> = {
  uploaded: "분석 대기",
  analyzing: "분석 중",
  ready: "확인 필요",
  failed: "분석 실패",
  confirmed: "저장됨",
};

// Badge 변형과 짝을 맞춘다. 색은 globals.css 토큰에서 온다.
export const statusVariant: Record<UploadStatus, "secondary" | "warning" | "destructive" | "default" | "outline"> = {
  uploaded: "outline",
  analyzing: "secondary",
  ready: "warning",
  failed: "destructive",
  confirmed: "default",
};
