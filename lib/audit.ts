/**
 * Audit fields `createdBy` / `updatedBy` store the acting user's **username**
 * (`User.name`), as plain text — not a foreign key.
 */
export function auditUsername(user: { name: string; email?: string }) {
  const name = user.name?.trim();
  if (name) return name;
  return user.email?.trim() || "unknown";
}
