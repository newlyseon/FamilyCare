import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { uploadsEnabled } from "@/lib/guard";

// 비공개 Blob의 원본 결과지를 검토 화면에 보여준다.
// TODO(로그인 도입 시): 요청한 사용자가 이 업로드의 주인인지 확인한다.
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  // DB를 모든 환경이 함께 쓰므로, 업로드가 꺼진 프로덕션에서는 테스트 파일도 보여주지 않는다.
  if (!uploadsEnabled() || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });

  const upload = await getDb().query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) return new Response("Not found", { status: 404 });

  const file = await get(upload.pathname, { access: "private" });
  if (!file || file.statusCode !== 200) return new Response("Not found", { status: 404 });

  return new Response(file.stream, {
    headers: {
      "Content-Type": upload.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(upload.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
