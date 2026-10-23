"use client";

import { upload } from "@vercel/blob/client";
import { LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyzeUpload, registerUpload } from "./actions";

type Step = "idle" | "uploading" | "analyzing" | "error";

const stepLabel: Record<Step, string> = {
  idle: "",
  uploading: "파일을 올리는 중…",
  analyzing: "AI가 결과지를 읽는 중… (20~30초)",
  error: "",
};

export function UploadForm({ members }: { members: { id: string; name: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [memberId, setMemberId] = useState(members.length === 1 ? members[0].id : "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = step === "uploading" || step === "analyzing";

  if (members.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
        <p className="text-base">결과지를 올리기 전에 부모님 정보를 먼저 추가하세요.</p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/members/new">부모님 추가</Link>
        </Button>
      </div>
    );
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      setStep("uploading");
      const blob = await upload(`uploads/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: file.type,
      });
      const registered = await registerUpload({ pathname: blob.pathname, filename: file.name, memberId });
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
    <div className="space-y-4 rounded-xl border-2 border-dashed border-border p-6 text-center">
      <div className="mx-auto grid max-w-xs gap-1.5 text-left">
        <Label htmlFor="upload-member">누구의 결과지인가요?</Label>
        <Select value={memberId} onValueChange={setMemberId} disabled={busy}>
          <SelectTrigger id="upload-member" className="w-full">
            <SelectValue placeholder="부모님 선택" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="lg" disabled={busy || !memberId} onClick={() => inputRef.current?.click()}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
        결과지 올리기
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="결과지 파일 선택"
        disabled={busy || !memberId}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <p className="text-sm text-muted-foreground">PDF, PNG, JPG, WEBP · 최대 20MB</p>
      {busy && (
        <p role="status" className="text-base font-medium">
          {stepLabel[step]}
        </p>
      )}
      {error && (
        <p role="alert" className="text-base text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
