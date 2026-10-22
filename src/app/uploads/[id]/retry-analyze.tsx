"use client";

import { LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { analyzeUpload } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RetryAnalyze({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await analyzeUpload(uploadId);
            if (!result.ok) setError(result.error);
            router.refresh();
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
        {pending ? "AI가 결과지를 읽는 중… (20~30초)" : "AI로 다시 분석"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
