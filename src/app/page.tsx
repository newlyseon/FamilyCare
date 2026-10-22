import { desc } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { uploadsEnabled } from "@/lib/guard";
import { statusLabel, statusVariant } from "@/lib/status";
import { UploadForm } from "./upload-form";

async function UploadList() {
  await connection();
  if (!uploadsEnabled()) return null;
  const rows = await getDb().select().from(uploads).orderBy(desc(uploads.createdAt)).limit(50);
  if (rows.length === 0) return <p className="text-muted-foreground">아직 올린 결과지가 없습니다.</p>;

  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/uploads/${row.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
              <span className="min-w-0 truncate">{row.filename}</span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>
                {row.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function UploadSection() {
  await connection();
  if (!uploadsEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 업로드가 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
  return <UploadForm />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold">FamilyCare</h1>
      <p className="mt-1 text-muted-foreground">검진 결과지를 올리면 AI가 항목과 추적 권고를 정리해 줍니다.</p>

      <Alert variant="warning" className="mt-6">
        <AlertDescription>테스트 버전입니다. 로그인 기능이 없으니 실제 건강 정보는 올리지 마세요.</AlertDescription>
      </Alert>

      <section className="mt-6">
        <Suspense fallback={null}>
          <UploadSection />
        </Suspense>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-heading text-lg font-semibold">올린 결과지</h2>
        <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
          <UploadList />
        </Suspense>
      </section>
    </main>
  );
}
