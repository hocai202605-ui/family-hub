import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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

  const uploadDir = path.join(process.cwd(), "public", "uploads", "goals");
  await mkdir(uploadDir, { recursive: true });

  const imageUrls: string[] = [];

  for (const file of files) {
    const ext = allowedTypes[file.type];
    if (!ext) {
      return NextResponse.json({ error: `Định dạng ${file.type} không được hỗ trợ. Chỉ nhận JPG, PNG, WEBP, GIF.` }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `File ${file.name} vượt quá dung lượng tối đa 5MB.` }, { status: 400 });
    }

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    imageUrls.push(`/uploads/goals/${filename}`);
  }

  return NextResponse.json({
    imageUrl: imageUrls[0],
    imageUrls,
  });
}
