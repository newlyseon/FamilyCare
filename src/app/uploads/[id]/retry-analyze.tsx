"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { analyzeUpload } from "@/app/actions";

export function RetryAnalyze({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await analyzeUpload(uploadId);
            if (!result.ok) setError(result.error);
            router.refresh();
          })
        }
      >
        {pending ? "AI가 결과지를 읽는 중… (20~30초)" : "AI로 다시 분석"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
