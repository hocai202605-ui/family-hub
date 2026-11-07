import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";
import { uploadGoalImage } from "@/lib/supabase-storage";
import { GOAL_IMAGE_TYPES, MAX_GOAL_IMAGE_BYTES } from "@/lib/goal-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request, "goals");
  if ("response" in auth) return auth.response;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Dữ liệu upload không hợp lệ." }, { status: 400 });
  }
  const fileEntries = form.getAll("files").concat(form.getAll("file"));
  // FormData entries are strings or files. Node 18 has no global File constructor.
  const files = fileEntries.filter((entry): entry is File => typeof entry !== "string");

  if (files.length === 0) {
    return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 file hình ảnh." }, { status: 400 });
  }

  if (files.length > 5) {
    return NextResponse.json({ error: "Chỉ cho phép tải lên tối đa 5 hình ảnh." }, { status: 400 });
  }

  const imageUrls: string[] = [];

  for (const file of files) {
    const ext = GOAL_IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: `Định dạng ${file.type} không được hỗ trợ. Chỉ nhận JPG, PNG, WEBP, GIF.` }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_GOAL_IMAGE_BYTES) {
      return NextResponse.json({ error: `File ${file.name} phải có dung lượng từ 1 byte đến 4MB.` }, { status: 400 });
    }
  }

  if (files.reduce((total, file) => total + file.size, 0) > MAX_GOAL_IMAGE_BYTES) {
    return NextResponse.json({ error: "Vui lòng tải từng ảnh, tổng dung lượng mỗi lần upload tối đa 4MB." }, { status: 400 });
  }

  try {
    for (const file of files) {
      const ext = GOAL_IMAGE_TYPES[file.type];
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
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Không thể lưu ảnh lên Supabase Storage.",
    }, { status: 502 });
  }

  return NextResponse.json({
    imageUrl: imageUrls[0],
    imageUrls,
  });
}
