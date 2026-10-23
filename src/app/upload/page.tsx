import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { dataEnabled } from "@/lib/guard";
import { getMembers } from "@/lib/queries";
import { UploadForm } from "../upload-form";

async function Form({ searchParams }: { searchParams: PageProps<"/upload">["searchParams"] }) {
  await connection();
  if (!dataEnabled()) notFound();
  const [sp, members] = await Promise.all([searchParams, getMembers()]);
  const defaultMemberId = typeof sp.member === "string" ? sp.member : undefined;
  return <UploadForm members={members.map((m) => ({ id: m.id, name: m.name }))} defaultMemberId={defaultMemberId} />;
}

export default function UploadPage({ searchParams }: PageProps<"/upload">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Button asChild variant="link" className="px-0">
        <Link href="/">← 홈으로</Link>
      </Button>
      <h1 className="mt-2 mb-1 font-heading text-2xl font-bold">결과지 올리기</h1>
      <p className="mb-6 text-muted-foreground">PDF나 사진을 올리면 AI가 항목과 추적 권고를 정리해요. 저장 전에 직접 확인할 수 있어요.</p>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
