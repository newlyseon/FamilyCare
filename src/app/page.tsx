import { asc, desc, eq } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { members, uploads } from "@/db/schema";
import { dataEnabled } from "@/lib/guard";
import { ageThisYear, sexLabel } from "@/lib/member-schema";
import { statusLabel, statusVariant } from "@/lib/status";
import { UploadForm } from "./upload-form";

const getMembers = () => getDb().select().from(members).orderBy(asc(members.createdAt));

async function MemberList() {
  await connection();
  if (!dataEnabled()) return null;
  const rows = await getMembers();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((m) => (
        <Card key={m.id} className="gap-2">
          <CardHeader>
            <CardTitle className="text-lg">{m.name}</CardTitle>
            <CardDescription className="text-base">
              {m.birthYear}년생 · {ageThisYear(m.birthYear)}세 · {sexLabel[m.sex]}
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="icon" aria-label={`${m.name} 정보 수정`}>
                <Link href={`/members/${m.id}/edit`}>
                  <Pencil />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          {(m.smoking !== "never" || m.liverHighRisk) && (
            <CardContent className="flex flex-wrap gap-1.5">
              {m.smoking !== "never" && <Badge variant="secondary">{m.smoking === "current" ? "흡연" : "과거 흡연"}{m.packYears ? ` ${m.packYears}갑년` : ""}</Badge>}
              {m.liverHighRisk && <Badge variant="secondary">간암 고위험</Badge>}
            </CardContent>
          )}
        </Card>
      ))}
      <Button asChild variant="outline" size="lg" className="h-auto min-h-24 border-dashed">
        <Link href="/members/new">
          <Plus />
          부모님 추가
        </Link>
      </Button>
    </div>
  );
}

async function UploadList() {
  await connection();
  if (!dataEnabled()) return null;
  const rows = await getDb()
    .select({ upload: uploads, memberName: members.name })
    .from(uploads)
    .leftJoin(members, eq(uploads.memberId, members.id))
    .orderBy(desc(uploads.createdAt))
    .limit(50);
  if (rows.length === 0) return <p className="text-muted-foreground">아직 올린 결과지가 없습니다.</p>;

  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">
        {rows.map(({ upload: row, memberName }) => (
          <li key={row.id}>
            <Link href={`/uploads/${row.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
              <span className="min-w-0 truncate">
                {memberName && <span className="mr-2 text-muted-foreground">{memberName}</span>}
                {row.filename}
              </span>
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
  if (!dataEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 업로드가 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
  const rows = await getMembers();
  return <UploadForm members={rows.map((m) => ({ id: m.id, name: m.name }))} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold">FamilyCare</h1>
      <p className="mt-1 text-muted-foreground">검진 결과지를 올리면 AI가 항목과 추적 권고를 정리해 줍니다.</p>

      <Alert variant="warning" className="mt-6">
        <AlertDescription>테스트 버전입니다. 로그인 기능이 없으니 실제 건강 정보는 올리지 마세요.</AlertDescription>
      </Alert>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-semibold">부모님</h2>
        <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
          <MemberList />
        </Suspense>
      </section>

      <section className="mt-8">
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
