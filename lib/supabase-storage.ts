import { mkdir, writeFile } from "fs/promises";
import path from "path";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://phmqqfgtgvtcbovuuenh.supabase.co"
).replace(/\/$/, "");

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const GOALS_BUCKET = "goals";

/**
 * Upload ảnh lên Supabase Storage bucket "goals".
 * Trả về Public CDN URL vĩnh viễn không bao giờ mất khi redeploy.
 * Nếu Supabase Storage chưa sẵn sàng hoặc offline, tự động fallback lưu vào public/uploads/goals.
 */
export async function uploadGoalImage({
  buffer,
  filename,
  contentType,
}: {
  buffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<string> {
  if (SUPABASE_KEY && SUPABASE_URL) {
    try {
      const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${GOALS_BUCKET}/${encodeURIComponent(filename)}`;

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (res.ok) {
        // Trả về Public URL từ Supabase Storage
        return `${SUPABASE_URL}/storage/v1/object/public/${GOALS_BUCKET}/${encodeURIComponent(filename)}`;
      }

      const errText = await res.text();
      console.warn(`[Supabase Storage] Upload failed (${res.status}): ${errText}`);
    } catch (err) {
      console.warn("[Supabase Storage] Network error, fallback to local:", err);
    }
  }

  // Fallback sang local disk nếu không có internet hoặc credentials
  const uploadDir = path.join(process.cwd(), "public", "uploads", "goals");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/goals/${filename}`;
}
