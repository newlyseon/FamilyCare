import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDb } from "@/db";
import { checkupItems, checkups, followUps, uploads } from "@/db/schema";
import { uploadsEnabled } from "@/lib/guard";
import { statusLabel } from "@/lib/status";
import { RetryAnalyze } from "./retry-analyze";
import { ReviewForm } from "./review-form";

async function Saved({ uploadId }: { uploadId: string }) {
  const db = getDb();
  const checkup = await db.query.checkups.findFirst({ where: eq(checkups.uploadId, uploadId) });
  if (!checkup) return null;
  const [items, follows] = await Promise.all([
    db.select().from(checkupItems).where(eq(checkupItems.checkupId, checkup.id)).orderBy(asc(checkupItems.position)),
    db.select().from(followUps).where(eq(followUps.checkupId, checkup.id)),
  ]);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-zinc-500">검진일</dt>
        <dd>{checkup.examDate ?? "-"}</dd>
        <dt className="text-zinc-500">기관</dt>
        <dd>{checkup.institution ?? "-"}</dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-2 pr-3">항목</th>
              <th className="py-2 pr-3">결과</th>
              <th className="py-2">판정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pr-3">{item.name}</td>
                <td className="py-2 pr-3">{[item.value, item.unit].filter(Boolean).join(" ") || item.finding || "-"}</td>
                <td className="py-2">{item.judgment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {follows.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">추적검사 권고</h3>
          <ul className="list-disc space-y-1 pl-5">
            {follows.map((f) => (
              <li key={f.id}>
                {f.target}: {f.recommendedTiming}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uploadsEnabled() || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const upload = await getDb().query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) notFound();

  const fileUrl = `/api/files/${upload.id}`;
  const isPdf = upload.contentType === "application/pdf";

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="min-w-0 truncate text-xl font-bold">{upload.filename}</h1>
        <span className="text-sm text-zinc-500">{statusLabel[upload.status]}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-label="원본 결과지" className="lg:sticky lg:top-4 lg:self-start">
          {isPdf ? (
            // 휴대폰 브라우저는 PDF를 iframe에 잘 그리지 못해, 넓은 화면에서만 바로 보여주고 좁은 화면은 새 창 링크를 쓴다.
            <iframe src={fileUrl} title="원본 결과지" className="hidden h-[70vh] w-full rounded-lg border border-zinc-200 lg:block dark:border-zinc-800" />
          ) : (
            // 비공개 Blob을 인증된 라우트로 스트리밍하므로 next/image 최적화를 쓰지 않는다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="원본 결과지" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800" />
          )}
          <a
            href={fileUrl}
            target="_blank"
            className={`mt-2 ${isPdf ? "block rounded-lg border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 lg:inline-block lg:border-0 lg:p-0 lg:text-sm lg:font-normal lg:underline" : "inline-block text-sm text-blue-600 underline"}`}
          >
            원본 결과지 새 창으로 보기
          </a>
        </section>

        <section aria-label="정리된 내용">
          {upload.status === "ready" && upload.draft && <ReviewForm uploadId={upload.id} draft={upload.draft} />}
          {upload.status === "confirmed" && <Saved uploadId={upload.id} />}
          {upload.status === "analyzing" && <p>AI가 결과지를 읽는 중입니다. 잠시 후 새로고침하세요.</p>}
          {(upload.status === "failed" || upload.status === "uploaded") && (
            <div className="space-y-3">
              {upload.error && <p className="text-red-600">분석 실패: {upload.error}</p>}
              <RetryAnalyze uploadId={upload.id} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function Page({ params }: PageProps<"/uploads/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 underline">
        ← 목록으로
      </Link>
      <div className="mt-4">
        <Suspense fallback={<p className="text-zinc-500">불러오는 중…</p>}>
          <Review params={params} />
        </Suspense>
      </div>
    </main>
  );
}
