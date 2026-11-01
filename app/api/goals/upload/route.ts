import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";
import { uploadGoalImage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // Hỗ trợ lên đến 10MB
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const form = await request.formData();
  const fileEntries = form.getAll("files").concat(form.getAll("file"));
  const files = fileEntries.filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 file hình ảnh." }, { status: 400 });
  }

  if (files.length > 5) {
    return NextResponse.json({ error: "Chỉ cho phép tải lên tối đa 5 hình ảnh." }, { status: 400 });
  }

  const imageUrls: string[] = [];

  for (const file of files) {
    const ext = allowedTypes[file.type];
    if (!ext) {
      return NextResponse.json({ error: `Định dạng ${file.type} không được hỗ trợ. Chỉ nhận JPG, PNG, WEBP, GIF.` }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `File ${file.name} vượt quá dung lượng tối đa 10MB.` }, { status: 400 });
    }

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Tải trực tiếp lên Supabase Storage CDN
    const savedUrl = await uploadGoalImage({
      buffer,
      filename,
      contentType: file.type,
    });

    imageUrls.push(savedUrl);
  }

  return NextResponse.json({
    imageUrl: imageUrls[0],
    imageUrls,
  });
}
