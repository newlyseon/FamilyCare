import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ParentTabs } from "@/components/parent-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { members, uploads } from "@/db/schema";
import { formatExamDate, formatYearMonth, outcomeLabel } from "@/lib/follow-up";
import { groupFollowUps, type FollowUpRow as Row } from "@/lib/follow-up-groups";
import { dataEnabled } from "@/lib/guard";
import { getMemberHistory, getMembers } from "@/lib/queries";
import { statusLabel, statusVariant } from "@/lib/status";
import { ResultFormToggle } from "./result-form";

function FollowUpCard({ row, tone }: { row: Row; tone: "now" | "scheduled" | "done" }) {
  const { follow: f, eff } = row;
  const badge =
    row.doneLater ? { variant: "secondary" as const, label: "다시 받음" }
    : eff.status === "resolved" ? { variant: "secondary" as const, label: "이상 없음" }
    : eff.status === "treatment" ? { variant: "destructive" as const, label: "치료 필요" }
    : eff.state === "overdue" ? { variant: "destructive" as const, label: "기한 지남" }
    : eff.state === "soon" ? { variant: "warning" as const, label: "곧 다가옴" }
    : eff.state === "unknown" ? { variant: "outline" as const, label: "시기 모름" }
    : { variant: "outline" as const, label: eff.due ? `${formatYearMonth(eff.due)}` : "예정" };
  const results = [...f.results].sort((a, b) => b.testedOn.localeCompare(a.testedOn));

  return (
    <Card id={`fu-${f.id}`} size="sm" className={tone === "now" ? "scroll-mt-4 ring-destructive/40" : "scroll-mt-4"}>
      <CardHeader>
        <CardTitle className="text-base">{f.target}</CardTitle>
        <CardDescription>
          {f.recommendedTiming} 추적 권고{row.examDate ? ` · ${formatExamDate(row.examDate)} 결과지` : ""}
          {eff.status === "open" && eff.due && tone === "now" ? ` · ${formatYearMonth(eff.due)}까지` : ""}
        </CardDescription>
        <CardAction>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {results.length > 0 && (
          <ul className="space-y-1 text-sm">
            {results.map((r) => (
              <li key={r.id} className="text-muted-foreground">
                <span className="text-foreground">{formatExamDate(r.testedOn)} {outcomeLabel[r.outcome]}</span>
                {r.nextMonths ? ` · ${r.nextMonths}개월 후 다시` : ""}
                {r.hospital ? ` · ${r.hospital}` : ""}
                {r.memo ? ` · ${r.memo}` : ""}
              </li>
            ))}
          </ul>
        )}
        {row.doneLater && <p className="text-sm text-muted-foreground">{formatExamDate(row.doneLater)} 검진에서 다시 받았어요.</p>}
        {eff.status === "treatment" && <p className="text-sm text-muted-foreground">담당 의사 안내에 따라 진료를 이어가세요.</p>}
        {tone !== "done" && <ResultFormToggle followUpId={f.id} />}
      </CardContent>
    </Card>
  );
}

async function FollowUpSection({ memberParam }: { memberParam?: string }) {
  const members = await getMembers();
  if (members.length === 0) return null;
  const member = members.find((m) => m.id === memberParam) ?? members[0];
  const { now, scheduled, done } = groupFollowUps(await getMemberHistory(member.id));
  const groups = [
    { key: "now", title: "지금 확인", rows: now, empty: "기한이 지났거나 곧 다가오는 추적검사가 없어요." },
    { key: "scheduled", title: "정기 추적", rows: scheduled, empty: "예정된 추적검사가 없어요." },
    { key: "done", title: "해결 완료", rows: done, empty: "아직 끝난 추적검사가 없어요." },
  ] as const;

  return (
    <div className="space-y-6">
      <ParentTabs members={members} activeId={member.id} basePath="/records" />
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`grp-${g.key}`} className="space-y-2">
          <h2 id={`grp-${g.key}`} className="font-heading text-lg font-semibold">
            {g.title} <span className="text-base font-normal text-muted-foreground">{g.rows.length}</span>
          </h2>
          {g.rows.length === 0 ? <p className="text-sm text-muted-foreground">{g.empty}</p> : g.rows.map((r) => <FollowUpCard key={r.follow.id} row={r} tone={g.key} />)}
        </section>
      ))}
    </div>
  );
}

async function UploadList() {
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

async function RecordsContent({ searchParams }: { searchParams: PageProps<"/records">["searchParams"] }) {
  await connection();
  if (!dataEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 기능이 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
  const sp = await searchParams;
  return (
    <div className="space-y-10">
      <FollowUpSection memberParam={typeof sp.member === "string" ? sp.member : undefined} />
      <section aria-labelledby="uploads" className="space-y-3">
        <h2 id="uploads" className="font-heading text-lg font-semibold">
          올린 결과지
        </h2>
        <UploadList />
      </section>
    </div>
  );
}

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
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
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <RecordsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
