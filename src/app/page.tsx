import { CircleCheck, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ParentTabs } from "@/components/parent-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { followUpDue, followUpState, formatExamDate, formatYearMonth } from "@/lib/follow-up";
import { dataEnabled } from "@/lib/guard";
import { ageThisYear } from "@/lib/member-schema";
import { getLatestCheckup, getMemberHistory, getMembers, getPendingReviews, hasConfirmedCheckup } from "@/lib/queries";
import { judgeScreenings } from "@/lib/screening/judge";
import { cn } from "@/lib/utils";
import { UploadForm } from "./upload-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type MemberRow = Awaited<ReturnType<typeof getMembers>>[number];

const TestNotice = () => (
  <Alert variant="warning">
    <AlertDescription>테스트 버전입니다. 로그인 기능이 없으니 실제 건강 정보는 올리지 마세요.</AlertDescription>
  </Alert>
);

function Metric({ value, label, tone = "default" }: { value: number; label: string; tone?: "default" | "danger" }) {
  return (
    <div className={cn("flex-1 rounded-lg py-3 text-center", tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted")}>
      <p className="font-heading text-2xl font-bold">{value}</p>
      <p className={cn("text-sm", tone === "danger" ? "text-destructive" : "text-muted-foreground")}>{label}</p>
    </div>
  );
}

async function PendingReviews() {
  const pending = await getPendingReviews();
  if (pending.length === 0) return null;
  return (
    <Alert variant="info">
      <AlertDescription>
        검토를 기다리는 결과지가 {pending.length}개 있어요.{" "}
        <Link href={`/uploads/${pending[0].id}`} className="font-medium underline underline-offset-3">
          {pending[0].memberName ? `${pending[0].memberName} 결과지 ` : ""}확인하기
        </Link>
      </AlertDescription>
    </Alert>
  );
}

// 첫 방문: 저장한 검진이 아직 없을 때. 결과지 올리기를 가장 크게 보여준다.
function FirstVisit({ members }: { members: MemberRow[] }) {
  const hasMembers = members.length > 0;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">FamilyCare</h1>
        <p className="mt-1 text-muted-foreground">부모님 검진 결과지를 올리면 올해 받을 검진을 정리해 드려요.</p>
      </div>
      <TestNotice />
      <PendingReviews />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">1. 부모님 추가</CardTitle>
          <CardDescription>{hasMembers ? members.map((m) => m.name).join(", ") : "검진 대상을 정하는 데 성별·출생연도가 필요해요"}</CardDescription>
          <CardAction>
            {hasMembers ? (
              <Badge variant="secondary">
                <CircleCheck aria-hidden />
                완료
              </Badge>
            ) : (
              <Button asChild size="lg">
                <Link href="/members/new?next=/">부모님 추가</Link>
              </Button>
            )}
          </CardAction>
        </CardHeader>
      </Card>

      <section aria-labelledby="step-upload" className={cn("space-y-3", !hasMembers && "opacity-60")}>
        <h2 id="step-upload" className="font-heading text-lg font-semibold">
          2. 지난 검진 결과지 올리기
        </h2>
        {hasMembers ? (
          <>
            <p className="text-sm text-muted-foreground">PDF나 사진 · 여러 해를 올릴수록 판정이 정확해져요.</p>
            <UploadForm members={members.map((m) => ({ id: m.id, name: m.name }))} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">부모님을 먼저 추가하면 올릴 수 있어요.</p>
        )}
      </section>

      <Card size="sm" className="text-muted-foreground">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">3. 올해 받을 검진 확인</CardTitle>
          <CardDescription>결과지를 저장하면 열려요</CardDescription>
          <CardAction>
            <Lock className="size-5" aria-label="잠김" />
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

// 다시 방문: 선택한 부모님의 가장 최근 검진을 기준으로 지금 챙길 것을 먼저 보여준다.
async function Returning({ members, memberParam, saved }: { members: MemberRow[]; memberParam?: string; saved: boolean }) {
  // 주소로 고른 부모님이 없으면, 저장한 검진이 있는 첫 부모님을 보여준다.
  let member = members.find((m) => m.id === memberParam);
  let latest = member ? await getLatestCheckup(member.id) : null;
  if (!member) {
    for (const m of members) {
      latest = await getLatestCheckup(m.id);
      if (latest) { member = m; break; }
    }
    member ??= members[0];
  }

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-heading text-2xl font-bold">FamilyCare</h1>
      <Button asChild variant="outline">
        <Link href={`/upload?member=${member.id}`}>
          <Plus />
          결과지
        </Link>
      </Button>
    </div>
  );

  if (!latest) {
    return (
      <div className="space-y-4">
        {header}
        <ParentTabs members={members} activeId={member.id} basePath="/" />
        <Card>
          <CardHeader>
            <CardTitle>{member.name}의 저장한 검진이 아직 없어요</CardTitle>
            <CardDescription>지난 결과지를 올리면 여기에 요약이 나와요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href={`/upload?member=${member.id}`}>결과지 올리기</Link>
            </Button>
          </CardContent>
        </Card>
        <PendingReviews />
      </div>
    );
  }

  const follows = latest.follows
    .map((f) => {
      const due = followUpDue(latest.examDate, f.recommendedMonths);
      return { ...f, due, state: followUpState(due) };
    })
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
  const urgent = follows.filter((f) => f.state === "overdue" || f.state === "soon");
  const scheduled = follows.filter((f) => f.state === "scheduled" || f.state === "unknown");
  const flagged = latest.items.filter((i) => i.judgment === "주의" || i.judgment === "이상" || i.judgment === "추적필요");
  const verdicts = judgeScreenings(member, await getMemberHistory(member.id));
  const required = verdicts.filter((v) => v.category === "required");
  const recommended = verdicts.filter((v) => v.category === "recommended");
  const skipped = verdicts.filter((v) => v.category === "skip");
  const needsCheck = verdicts.filter((v) => v.category === "check");

  return (
    <div className="space-y-4">
      {header}
      <ParentTabs members={members} activeId={member.id} basePath="/" />
      <p className="text-sm text-muted-foreground">
        {latest.examDate ? `${formatExamDate(latest.examDate)} 검진 기준` : "검진일 미입력"} · {ageThisYear(member.birthYear)}세
      </p>
      {saved && (
        <Alert variant="info">
          <AlertDescription>방금 저장한 검진이 반영됐어요.</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Metric value={urgent.length} label="지금 확인" tone={urgent.length > 0 ? "danger" : "default"} />
        <Metric value={required.length + recommended.length} label="올해 신청" />
        <Metric value={scheduled.length} label="정기 추적" />
      </div>

      {urgent.map((f) => (
        <Card key={f.id} size="sm" className="ring-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">{f.target}</CardTitle>
            <CardDescription>
              {f.recommendedTiming} 추적 권고{f.due ? ` · ${formatYearMonth(f.due)}까지${f.state === "overdue" ? "였어요" : ""}` : ""}
            </CardDescription>
            <CardAction>
              <Badge variant={f.state === "overdue" ? "destructive" : "warning"}>{f.state === "overdue" ? "기한 지남" : "곧 다가옴"}</Badge>
            </CardAction>
          </CardHeader>
        </Card>
      ))}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{new Date().getFullYear()} 신청할 검진</CardTitle>
          <CardAction>
            <Button asChild variant="link" className="px-0">
              <Link href={`/checkup?member=${member.id}`}>전체 보기</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {required.length > 0 && (
            <p className="flex items-start gap-2 text-base">
              <Badge variant="warning" className="mt-0.5">
                필수
              </Badge>
              <span>{required.map((v) => v.title).join(" · ")}</span>
            </p>
          )}
          {recommended.length > 0 && (
            <p className="flex items-start gap-2 text-base">
              <Badge variant="secondary" className="mt-0.5">
                권장
              </Badge>
              <span>{recommended.map((v) => v.title).join(" · ")}</span>
            </p>
          )}
          {needsCheck.length > 0 && (
            <p className="text-sm text-destructive">확인 필요 {needsCheck.length}개: {needsCheck.map((v) => v.title).join(" · ")}</p>
          )}
          {skipped.length > 0 && (
            <p className="text-sm text-muted-foreground">
              건너뜀: {skipped.map((v) => `${v.title}${v.nextYear ? ` (다음 ${v.nextYear})` : ""}`).join(" · ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">주의가 필요한 항목</CardTitle>
          <CardAction>
            <Button asChild variant="link" className="px-0">
              <Link href={`/records?member=${member.id}`}>기록 보기</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {flagged.length === 0 ? (
            <p className="text-muted-foreground">주의·이상 판정을 받은 항목이 없어요.</p>
          ) : (
            <ul className="space-y-1">
              {flagged.slice(0, 4).map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-base">
                  <span>{i.name}</span>
                  <span className="text-muted-foreground">{[i.value, i.unit].filter(Boolean).join(" ") || i.finding || i.judgment}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <PendingReviews />
    </div>
  );
}

async function HomeContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  if (!dataEnabled()) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">FamilyCare</h1>
        <Alert>
          <AlertDescription>지금은 개발 중이라 이 주소에서는 기능이 꺼져 있습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }
  const [sp, members, confirmed] = await Promise.all([searchParams, getMembers(), hasConfirmedCheckup()]);
  if (!confirmed || members.length === 0) return <FirstVisit members={members} />;
  const memberParam = typeof sp.member === "string" ? sp.member : undefined;
  return <Returning members={members} memberParam={memberParam} saved={sp.saved === "1"} />;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
