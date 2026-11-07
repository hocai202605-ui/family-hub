// Each multipart request must fit Vercel's 4.5 MB function payload limit.
export const MAX_GOAL_IMAGE_BYTES = 4 * 1024 * 1024;
export const GOAL_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
