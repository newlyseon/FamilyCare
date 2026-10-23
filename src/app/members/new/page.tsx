import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dataEnabled } from "@/lib/guard";
import { createMember } from "../actions";
import { MemberForm } from "../member-form";

async function Form() {
  await connection();
  if (!dataEnabled()) notFound();
  return <MemberForm action={createMember} submitLabel="부모님 추가" />;
}

export default function NewMemberPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold">부모님 추가</h1>
      <p className="mt-1 mb-8 text-muted-foreground">올해 어떤 검진을 받아야 하는지 판단하는 데 쓰는 정보입니다.</p>
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <Form />
      </Suspense>
    </main>
  );
}
