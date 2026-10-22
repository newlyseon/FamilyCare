"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { analyzeUpload, registerUpload } from "./actions";

type Step = "idle" | "uploading" | "analyzing" | "error";

const stepLabel: Record<Step, string> = {
  idle: "",
  uploading: "파일을 올리는 중…",
  analyzing: "AI가 결과지를 읽는 중… (20~30초)",
  error: "",
};

export function UploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = step === "uploading" || step === "analyzing";

  async function handleFile(file: File) {
    setError(null);
    try {
      setStep("uploading");
      const blob = await upload(`uploads/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: file.type,
      });
      const registered = await registerUpload({ pathname: blob.pathname, filename: file.name });
      if (!registered.ok) throw new Error(registered.error);

      setStep("analyzing");
      // 분석이 실패해도 검토 화면에서 오류를 보고 다시 시도할 수 있으므로 결과와 상관없이 이동한다.
      await analyzeUpload(registered.data.id);
      router.push(`/uploads/${registered.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했습니다");
      setStep("error");
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
      <label className={`inline-block cursor-pointer rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white ${busy ? "pointer-events-none opacity-60" : "hover:bg-blue-700"}`}>
        결과지 올리기
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </label>
      <p className="mt-3 text-sm text-zinc-500">PDF, PNG, JPG, WEBP · 최대 20MB</p>
      {busy && (
        <p role="status" className="mt-4 text-base font-medium">
          {stepLabel[step]}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-base text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
