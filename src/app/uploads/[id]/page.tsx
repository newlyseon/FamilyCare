import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { checkupItems, checkups, followUps, members, uploads } from "@/db/schema";
import { dataEnabled } from "@/lib/guard";
import { statusLabel, statusVariant } from "@/lib/status";
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
        <dt className="text-muted-foreground">검진일</dt>
        <dd>{checkup.examDate ?? "-"}</dd>
        <dt className="text-muted-foreground">기관</dt>
        <dd>{checkup.institution ?? "-"}</dd>
      </dl>
      <Table className="text-base">
        <TableHeader>
          <TableRow>
            <TableHead>항목</TableHead>
            <TableHead>결과</TableHead>
            <TableHead>판정</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell className="whitespace-normal">{[item.value, item.unit].filter(Boolean).join(" ") || item.finding || "-"}</TableCell>
              <TableCell>{item.judgment}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {follows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>추적검사 권고</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5">
              {follows.map((f) => (
                <li key={f.id}>
                  {f.target}: {f.recommendedTiming}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dataEnabled() || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const upload = await getDb().query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) notFound();
  const member = upload.memberId ? await getDb().query.members.findFirst({ where: eq(members.id, upload.memberId) }) : null;

  const fileUrl = `/api/files/${upload.id}`;
  const isPdf = upload.contentType === "application/pdf";

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          {member && <p className="text-sm text-muted-foreground">{member.name}의 결과지</p>}
          <h1 className="truncate font-heading text-xl font-bold">{upload.filename}</h1>
        </div>
        <Badge variant={statusVariant[upload.status]}>{statusLabel[upload.status]}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-label="원본 결과지" className="lg:sticky lg:top-4 lg:self-start">
          {isPdf ? (
            // 휴대폰 브라우저는 PDF를 iframe에 잘 그리지 못해, 넓은 화면에서만 바로 보여주고 좁은 화면은 새 창 링크를 쓴다.
            <iframe src={fileUrl} title="원본 결과지" className="hidden h-[70vh] w-full rounded-lg border border-border lg:block" />
          ) : (
            // 비공개 Blob을 인증된 라우트로 스트리밍하므로 next/image 최적화를 쓰지 않는다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="원본 결과지" className="w-full rounded-lg border border-border" />
          )}
          <Button asChild variant={isPdf ? "outline" : "link"} size="lg" className={`mt-2 ${isPdf ? "w-full lg:w-auto" : "px-0"}`}>
            <a href={fileUrl} target="_blank">
              원본 결과지 새 창으로 보기
            </a>
          </Button>
        </section>

        <section aria-label="정리된 내용">
          {upload.status === "ready" && upload.draft && <ReviewForm uploadId={upload.id} draft={upload.draft} />}
          {upload.status === "confirmed" && <Saved uploadId={upload.id} />}
          {upload.status === "analyzing" && <p>AI가 결과지를 읽는 중입니다. 잠시 후 새로고침하세요.</p>}
          {(upload.status === "failed" || upload.status === "uploaded") && (
            <div className="space-y-3">
              {upload.error && <p className="text-destructive">분석 실패: {upload.error}</p>}
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
      <Button asChild variant="link" className="px-0">
        <Link href="/">← 목록으로</Link>
      </Button>
      <div className="mt-4">
        <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
          <Review params={params} />
        </Suspense>
      </div>
    </main>
  );
}
