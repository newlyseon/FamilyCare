import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { dataEnabled } from "@/lib/guard";
import { updateMember } from "../../actions";
import { MemberForm } from "../../member-form";

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dataEnabled() || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const member = await getDb().query.members.findFirst({ where: eq(members.id, id) });
  if (!member) notFound();
  return (
    <>
      <h1 className="font-heading text-2xl font-bold">{member.name} 정보 수정</h1>
      <p className="mt-1 mb-8 text-muted-foreground">올해 어떤 검진을 받아야 하는지 판단하는 데 쓰는 정보입니다.</p>
      <MemberForm action={updateMember.bind(null, member.id)} member={member} submitLabel="저장" />
    </>
  );
}

export default function EditMemberPage({ params }: PageProps<"/members/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <Form params={params} />
      </Suspense>
    </main>
  );
}
