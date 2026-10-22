import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, assertUploadsEnabled } from "@/lib/guard";

// 브라우저가 Blob에 직접 올릴 수 있도록 업로드 토큰을 발급한다.
// 업로드 완료 콜백은 로컬에서 받을 수 없으므로 쓰지 않고, 클라이언트가 registerUpload로 알려준다.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    assertUploadsEnabled();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("uploads/")) throw new Error("잘못된 경로입니다");
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
