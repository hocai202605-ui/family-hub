---
name: add-dashboard-page
description: Add a new dashboard page under app/(dashboard) with requirePageAccess, nav registration, and optional client UI. Use when adding modules, routes, or sidebar entries.
---

# Add dashboard page

## Steps

1. **Menu key** — add to `MenuKey` and `navItems` in `lib/menu.ts` (set `adminOnly: true` if admin-only).
2. **Middleware** — if the path is new at top level, add it to `matcher` in `middleware.ts`.
3. **Page** — create `app/(dashboard)/<path>/page.tsx` as a server component:

   ```tsx
   import { requirePageAccess } from "@/lib/auth";

   export default async function Page() {
     await requirePageAccess("<menuKey>");
     return /* client UI or ComingSoonModule */;
   }
   ```

4. **UI**
   - Full feature: client component under `app/(dashboard)/components/`
   - Placeholder: `ComingSoonModule` from `./components/coming-soon-module`
5. **API** — if the page needs data, add/use routes with matching menu permission (skill `add-api-route`).
6. **Permissions** — USER role only sees keys granted in `MenuPermission`; ADMIN sees all. Document any new key in `docs/domain.md`.

## Checklist

- [ ] `requirePageAccess` with correct key
- [ ] Nav entry + `MenuKey` updated
- [ ] Middleware matcher updated if needed
- [ ] Visual style matches existing amber/slate cards
- [ ] No unauthenticated data fetch assumptions

## References

- `docs/domain.md`, `.grok/rules/30-ui-dashboard.md`, `app/(dashboard)/layout.tsx`
