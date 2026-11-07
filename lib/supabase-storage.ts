export const GOALS_BUCKET = "goals";

/**
 * Upload ảnh lên Supabase Storage bucket "goals".
 * Chỉ trả về URL khi upload thành công; không lưu vào filesystem của deployment.
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Thiếu cấu hình Supabase Storage trên máy chủ. Vui lòng kiểm tra NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.");
  }

  let response: Response;
  try {
    response = await fetch(`${url}/storage/v1/object/${GOALS_BUCKET}/${encodeURIComponent(filename)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("Không thể kết nối Supabase Storage. Ảnh chưa được lưu, vui lòng thử lại.");
  }
  if (!response.ok) {
    throw new Error(`Không thể lưu ảnh lên Supabase Storage (HTTP ${response.status}). Vui lòng kiểm tra bucket goals và quyền upload.`);
  }

  return `${url}/storage/v1/object/public/${GOALS_BUCKET}/${encodeURIComponent(filename)}`;
}
