export type FamilyMemberCode = "CK" | "VK" | "CON";

type AccountIdentity = {
  email: string;
  role?: "ADMIN" | "USER";
};

/**
 * Default family-member chip on expense/income forms based on logged-in account.
 * - ADMIN → CK
 * - email local-part `huongnt` → VK
 * - otherwise keep the form's module fallback
 */
export function defaultMemberForAccount(
  emailOrUser: string | AccountIdentity,
  fallback: FamilyMemberCode = "CK",
): FamilyMemberCode {
  const email = typeof emailOrUser === "string" ? emailOrUser : emailOrUser.email;
  const role = typeof emailOrUser === "string" ? undefined : emailOrUser.role;

  if (role === "ADMIN") {
    return "CK";
  }

  const localPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  if (localPart === "huongnt" || localPart.startsWith("huongnt.")) {
    return "VK";
  }

  return fallback;
}
