import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// F-06(올해 검진 판정) 전까지의 안내 화면
export default function CheckupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">올해 검진</h1>
      <Card>
        <CardHeader>
          <CardTitle>신청 목록을 준비하고 있어요</CardTitle>
          <CardDescription className="text-base">
            부모님 정보와 지난 검진 기록, 국가검진 주기를 바탕으로 올해 받을 검진을 필수·권장·건너뜀으로 나눠 보여줄 예정이에요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="lg">
            <Link href="/records">지금까지의 기록 보기</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
