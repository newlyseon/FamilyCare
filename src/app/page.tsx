import { desc } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { uploadsEnabled } from "@/lib/guard";
import { statusLabel } from "@/lib/status";
import { UploadForm } from "./upload-form";

async function UploadList() {
  await connection();
  if (!uploadsEnabled()) return null;
  const rows = await getDb().select().from(uploads).orderBy(desc(uploads.createdAt)).limit(50);
  if (rows.length === 0) return <p className="text-zinc-500">아직 올린 결과지가 없습니다.</p>;

  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/uploads/${row.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <span className="min-w-0 truncate">{row.filename}</span>
            <span className="shrink-0 text-sm text-zinc-500">
              {statusLabel[row.status]} · {row.createdAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function UploadSection() {
  await connection();
  if (!uploadsEnabled()) {
    return (
      <p className="rounded-xl bg-zinc-100 p-4 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        지금은 개발 중이라 이 주소에서는 업로드가 꺼져 있습니다.
      </p>
    );
  }
  return <UploadForm />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">FamilyCare</h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">검진 결과지를 올리면 AI가 항목과 추적 권고를 정리해 줍니다.</p>

      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        테스트 버전입니다. 로그인 기능이 없으니 실제 건강 정보는 올리지 마세요.
      </p>

      <section className="mt-6">
        <Suspense fallback={null}>
          <UploadSection />
        </Suspense>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">올린 결과지</h2>
        <Suspense fallback={<p className="text-zinc-500">불러오는 중…</p>}>
          <UploadList />
        </Suspense>
      </section>
    </main>
  );
}
