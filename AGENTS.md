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
- The user resumed Yeouido/Gwangjang replacement after confirming upload completion. Use only the final 23-photo folder 1wWDe4vaeJFqMxcOGO9-7v6woVf6D60iW. Earlier partial uploads remain archived. Public title is S-house; cover is selected photo 9.
- HEIM and Tied swapped positions: Tied order 3, HEIM order 11. Samjeon uses landscape evening exterior photo 14 after the user reconsidered the portrait front elevation.
- Yeonhui Seed now uses all 22 newly supplied photographs from folder 1l_WHiIKbIEBjkr4REJsO3Br8y5WBpfT1; selected photo 7 is the cover. User authorization supersedes the inherited folder label.
- The user requested GitHub and Vercel deployment and explicitly selected the free configuration. Do not upgrade to paid plans. Preserve full local originals; prepare smaller deployment files without removing public photographs.
- Remove the public Profile archive link. Preserve biography source evidence privately.

## User revisions, 2026-11-19

- The user subsequently requested all Samjeon 165-18 photographs removed, including both previously registered and newly supplied photographs. Keep the project unpublished and absent from the home selection; preserve all 54 photographs privately and retain history. This supersedes the earlier instruction to display Samjeon second.

- KyoboD and KyoboS are separate projects. Do not merge their photographs. The existing `kyobo-hottracks-2015` page is KyoboD; `kyobo-hottracks-s` is KyoboS. Keep the existing KyoboD cover (KyoboD-031).
- Exclude fixed file references KyoboD-007, KyoboD-039, KyoboD-046 and KyoboD-027 from the public website only. Preserve the Google Drive originals and immutable media/history. The subsequent request file also excludes KyoboD-002, 006, 008, 009, 019, 023, 024, 025, 028, 029, 030, 032, 035, 038, 040, 041, 043, 045 and KyoboS-002, 004, 005, 008, 010, 011, 012, 016, 018, 020, 022, 023, 025, 030, 031, 032, 034. After both requests, KyoboD has 25 photographs and KyoboS has 17.
- Photo review requests use the fixed file reference (for example, KyoboD-039), not the displayed sequence number. Preserve these references across exclusions, reordering and project splits. Keep the original 908-photo catalog baseline; apply later publication state separately so excluded photographs are not accidentally restored.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
