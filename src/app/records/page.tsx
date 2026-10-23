import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import { members, uploads } from "@/db/schema";
import { dataEnabled } from "@/lib/guard";
import { statusLabel, statusVariant } from "@/lib/status";

// 연도 탭과 상태별 묶음(F-12)은 다음 단계에서 만든다. 지금은 올린 결과지 목록을 보여준다.
async function UploadList() {
  await connection();
  if (!dataEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 기능이 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
  const rows = await getDb()
    .select({ upload: uploads, memberName: members.name })
    .from(uploads)
    .leftJoin(members, eq(uploads.memberId, members.id))
    .orderBy(desc(uploads.createdAt))
    .limit(100);
  if (rows.length === 0) return <p className="text-muted-foreground">아직 올린 결과지가 없어요.</p>;

  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">
        {rows.map(({ upload: row, memberName }) => (
          <li key={row.id}>
            <Link href={`/uploads/${row.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">{memberName ?? "부모님 미지정"}</span>
                <span className="block truncate">{row.filename}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted-foreground">
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

export default function RecordsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">기록</h1>
        <Button asChild variant="outline">
          <Link href="/upload">
            <Plus />
            결과지
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">연도별로 비교하는 화면은 준비 중이에요. 지금은 올린 결과지를 모아 보여줘요.</p>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <UploadList />
      </Suspense>
    </main>
  );
}
