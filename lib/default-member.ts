export type FamilyMemberCode = "CK" | "VK" | "CON";

type AccountIdentity = {
  email: string;
  name?: string;
  role?: "ADMIN" | "USER";
};

function identityKeys(email: string, name?: string) {
  const localPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  const username = name?.trim().toLowerCase() ?? "";
  return [localPart, username].filter(Boolean);
}

function matchesAccount(keys: string[], handle: string) {
  return keys.some((key) => key === handle || key.startsWith(`${handle}.`));
}

/**
 * Default family-member chip on expense/income forms based on logged-in account.
 * - ADMIN or `quynhdv` → CK
 * - `huongnt` or other non-admin accounts (when fallback is VK) → VK
 * - otherwise keep the form's module fallback
 */
export function defaultMemberForAccount(
  emailOrUser: string | AccountIdentity,
  fallback: FamilyMemberCode = "CK",
): FamilyMemberCode {
  const email = typeof emailOrUser === "string" ? emailOrUser : emailOrUser.email;
  const name = typeof emailOrUser === "string" ? undefined : emailOrUser.name;
  const role = typeof emailOrUser === "string" ? undefined : emailOrUser.role;
  const keys = identityKeys(email, name);

  if (role === "ADMIN" || matchesAccount(keys, "quynhdv")) {
    return "CK";
  }

  if (matchesAccount(keys, "huongnt")) {
    return "VK";
  }

  return fallback;
}
