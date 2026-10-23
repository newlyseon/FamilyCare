import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dataEnabled } from "@/lib/guard";
import { ageThisYear, sexLabel } from "@/lib/member-schema";
import { getMembers } from "@/lib/queries";

async function MemberList() {
  await connection();
  if (!dataEnabled()) {
    return (
      <Alert>
        <AlertDescription>지금은 개발 중이라 이 주소에서는 기능이 꺼져 있습니다.</AlertDescription>
      </Alert>
    );
  }
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
              {m.smoking !== "never" && (
                <Badge variant="secondary">
                  {m.smoking === "current" ? "흡연" : "과거 흡연"}
                  {m.packYears ? ` ${m.packYears}갑년` : ""}
                </Badge>
              )}
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

export default function MembersPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">부모님</h1>
      <p className="text-muted-foreground">성별·출생연도·위험 요인은 올해 받을 검진을 정하는 데 쓰여요.</p>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <MemberList />
      </Suspense>
    </main>
  );
}
