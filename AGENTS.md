# WOVN STUDIO

- Follow PRD.md. Public English editorial portfolio; Korean administration, English menu, white/paper-bone design.
- Never invent completed projects, contacts, awards, career years, or an approved logo.
- Next.js App Router + Payload authentication + PostgreSQL transactional editorial workflow.
- Drafts and immutable public snapshots are separate. Only Owner can publish, unpublish, restore, change accounts or see inquiries. Check server authority, never only hide buttons.
- All publication paths use a reviewed expected version. Never silently publish newer edits.
- Media is immutable; only derivatives referenced by current publications are publicly accessible. Originals stay private.
- Inquiry and notification job creation share one transaction. Never report delivery from the test mail adapter as real email delivery.
- No production publishing until verified content, storage, sender, privacy notice and operational checks are connected.
- Run pnpm typecheck, pnpm test, pnpm build for changes affecting server workflows. Preserve secrets and local data.

## User revisions, 2026-11-14

- Public projects show names and photographs only. Do not display years, categories, locations, project descriptions, role/company/photo-provider credits, or category filters. Keep internal provenance and rights records.
- Use touching photographs (0px gaps), an editorial magazine layout, and restrained typography smaller than the WOVN logo. No visible “사진 확대” text or duplicate thumbnail strip; retain accessible zoom controls.
- All portfolio photographs are user-authorized. Publish verified photograph projects locally. Ability and Cross-stitch stay unpublished at the user’s request; the five CG/model/uncertain projects stay drafts.

- Public navigation: Projects / Studio / Press / Contact. Press contains actual publication scans, not invented journal entries.
- All public interface copy, project titles, metadata and alternative text are English. Admin stays Korean. Original text inside photographs and publication scans is preserved.
- Project names are 11px, below the desktop main navigation size of 12px. Their final inset is 13px horizontal / 11px bottom on desktop, 11px / 8px on mobile; the home cover uses 17px / 14px and 11px / 10px.
- KYOBO HOTTRACKS is a Manual Design project; omit the branch from its public name and retain its original first cover.

- Samjeon is second in the project list; Gong Cha takes its former last position.
- The user resumed Yeouido/Gwangjang replacement after confirming upload completion. Use only the final 23-photo folder 1wWDe4vaeJFqMxcOGO9-7v6woVf6D60iW for the replacement. Earlier partial uploads remain archived. Yeonhui Seed replacement photos are awaiting the user.
- Remove the public Profile archive link. Preserve biography source evidence privately.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
