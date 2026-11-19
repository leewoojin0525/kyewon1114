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

- Samjeon was subsequently rebuilt using only the 31 photographs converted from the Google Drive high-resolution source folder. Publish Samjeon-001 through Samjeon-031 only, with Samjeon-018 as cover and the remaining references in numerical order. Do not restore the 23 legacy photographs. User-facing photo documents must contain only this new Samjeon set, without old/excluded Samjeon cards. This supersedes the temporary withdrawal instruction.

- KyoboD and KyoboS are separate projects. Do not merge their photographs. The existing `kyobo-hottracks-2015` page is KyoboD; `kyobo-hottracks-s` is KyoboS. Keep the existing KyoboD cover (KyoboD-031).
- The user approved a full photo reset from verified Google Drive high-resolution originals. This supersedes the earlier Kyobo exclusions and the old S-house 23-photo restriction. Rebuild high-resolution projects from their verified source derivatives; preserve projects with only low-resolution or unconfirmed source material and report those exceptions. Keep originals private and untouched.
- Current photo documents must be generated from `.data/current-photo-catalog.json`, which represents the reviewed current publication set. Never merge historical 908-photo baseline entries or excluded-photo cards into current documents. Historical source evidence remains private.
- KyoboD and KyoboS remain separate during the reset. Support a project containing only its verified cover photograph; publication still requires Owner authority, expected version, rights confirmation, alternative text, and an existing media asset.
- Use file references and current display order as separate columns in fresh lists. Start a new review-request state for the rebuilt catalog so earlier deletion requests do not silently apply again.

## Follow-up user revision, 2026-11-19: retain low-resolution photographs

- Restore the 115 Drive-source low-resolution photographs removed by the high-resolution-only pass. Keep low-resolution-only projects public. The current set is 26 projects / 806 photographs; 202 individual photographs are labeled low-resolution in private/user-facing catalogs, not on the public portfolio.
- Catalogs distinguish verified high-resolution derivatives, low-resolution photographs (restored or retained), and retained photographs requiring original-source confirmation. Do not omit a photograph solely for low resolution and do not upscale it.
- Restore the established project ordering from the pre-full-library project order: KyoboD first, Samjeon second, Tied third, Marina in its original position, Gong Cha last. Later additions HAB1, Elbon, and KyoboS are before Gong Cha; KyoboD and KyoboS remain separate.
- This revision supersedes the high-resolution-only selection rule above. Current catalog remains `.data/current-photo-catalog.json`; private restoration evidence is `.data/restore-lowres-20261119/`.

## Latest photo request, 2026-11-19: KyoboD

- Apply the user's 806-photo request file by removing KyoboD-002, 004, 006, 007, 011, 012, 015, 016, 021, 025, 027, 028, 029, 033, 034, 035, 038, 040, 041, 043, 045, and 046 from the public project and current catalogs. Keep private originals and immutable history.
- Current KyoboD has 25 photographs, with KyoboD-031 still the cover. Current total is 26 projects / 784 photographs. Other project photographs and all project ordering remain unchanged. This supersedes the restored 806-photo count above.

- KyoboD-only viewing trial: show one uncropped photograph with previous/next arrows, a current/total counter, and clickable thumbnails below. This user-requested exception supersedes the no-thumbnail rule only for `kyobo-hottracks-2015`; other projects retain their existing layout.

## Photo review retention rule — 2026-11-19

- Latest applied request: KyoboD has 28 published photos in the user's submitted order, with KyoboD-003 removed and KyoboD-006/016/043/046 restored at the end (no restoration position was specified). KyoboD-031 remains the cover. Samjeon-012 is now the Samjeon cover. Current totals: 787 published photographs, 19 deleted review-only photographs, 806 review cards across 26 projects. This supersedes earlier photo counts and cover selections.

- The private interactive review list supports visual ordering with first/previous/next buttons and desktop image drag-and-drop. Automatically number and persist the edited project order, and export requests in that order. These controls never directly modify website publications.

- Removing a photograph from the website must NOT remove its card from the private review list. Keep its thumbnail and stable filename/reference, visibly mark it `삭제됨`, distinguish its former order from current public order, and offer `복원 요청` in the review request export.
- Preserve private source files and review history. Restore to the website only on an explicit user restoration request through the normal reviewed publication workflow. Never merge review-only history into public catalogs or public media permissions.
- Maintain `.data/photo-review-history.json` when rebuilding the interactive review list. Counts must separately identify currently published and deleted photographs. This supersedes earlier instructions to remove deleted cards from the review list; unrelated legacy sets must not be reintroduced.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## All-project gallery — latest user revision

- Apply the enlarged KyoboD slideshow to every project detail page: uncropped large image, overlaid previous/next arrows, current/total count, and one auto-scrolling row of clickable thumbnails. This supersedes the KyoboD-only trial and earlier no-thumbnail rule. Keep public photo order and covers intact; Press keeps its existing publication layout. Reset the slideshow on project identity or publication-version changes.
