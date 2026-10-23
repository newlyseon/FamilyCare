import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ParentTabs } from "@/components/parent-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dataEnabled } from "@/lib/guard";
import { ageThisYear } from "@/lib/member-schema";
import { getMemberHistory, getMembers } from "@/lib/queries";
import { judgeScreenings, type Verdict, type VerdictCategory } from "@/lib/screening/judge";

const sections: { category: VerdictCategory; label: string; badge: "warning" | "secondary" | "outline" | "destructive"; description?: string }[] = [
  { category: "required", label: "필수", badge: "warning" },
  { category: "check", label: "확인 필요", badge: "destructive", description: "정보가 부족해 판정하지 못했어요. 아래 이유를 확인해 주세요." },
  { category: "recommended", label: "권장", badge: "secondary", description: "지난 검진에서 주의 판정을 받은 수치예요." },
  { category: "skip", label: "올해는 건너뜀", badge: "outline" },
];

// 항목 하나. 누르면 판정 근거(F-07)가 펼쳐진다.
function VerdictCard({ v }: { v: Verdict }) {
  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10 open:ring-foreground/20">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-base font-medium">{v.title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{v.summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {v.overdue && <Badge variant="destructive">기한 지남</Badge>}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3">
        <p className="mb-1 text-sm font-medium">판정 근거</p>
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {v.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {v.source && <p className="mt-2 text-xs text-muted-foreground">기준: {v.source}</p>}
      </div>
    </details>
  );
}

async function CheckupContent({ searchParams }: { searchParams: PageProps<"/checkup">["searchParams"] }) {
  await connection();
  if (!dataEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 기능이 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
  const [sp, members] = await Promise.all([searchParams, getMembers()]);
  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>부모님을 먼저 추가해 주세요</CardTitle>
          <CardDescription>성별과 출생연도가 있어야 올해 받을 검진을 정할 수 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/members/new?next=/checkup">부모님 추가</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  const member = members.find((m) => m.id === sp.member) ?? members[0];
  const history = await getMemberHistory(member.id);
  const verdicts = judgeScreenings(member, history);
  const year = new Date().getFullYear();
  const na = verdicts.filter((v) => v.category === "na");

  return (
    <div className="space-y-6">
      <ParentTabs members={members} activeId={member.id} basePath="/checkup" />
      <p className="text-sm text-muted-foreground">
        {year}년 신청 목록 · {member.birthYear}년생 {ageThisYear(member.birthYear)}세
        {history.length === 0 && " · 저장한 검진이 없어 국가검진 기준으로만 판정했어요"}
      </p>

      {sections.map(({ category, label, badge, description }) => {
        const list = verdicts.filter((v) => v.category === category);
        if (list.length === 0) return null;
        return (
          <section key={category} aria-labelledby={`sec-${category}`} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge id={`sec-${category}`} variant={badge}>
                {label}
              </Badge>
              <span className="text-sm text-muted-foreground">{list.length}개</span>
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {list.map((v) => (
              <VerdictCard key={v.id} v={v} />
            ))}
          </section>
        );
      })}

      {na.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">대상이 아닌 검진 {na.length}개</summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {na.map((v) => (
              <li key={v.id}>
                {v.title}: {v.summary}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-sm text-muted-foreground">
        판정은 저장한 기록과 국가검진 기준에 따른 참고 정보이며 의학적 진단이 아니에요. 신청 전에 검진기관이나 의료진과 상의하세요.
      </p>
    </div>
  );
}

export default function CheckupPage({ searchParams }: PageProps<"/checkup">) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">올해 검진</h1>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <CheckupContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
