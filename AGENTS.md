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

- Request file (5) adds Samjeon gallery ordering: start with Samjeon-018, keep Samjeon-012 tenth in the gallery and retain it as the project cover. Use the optional `galleryOrder` field to distinguish display order from `hero`; keep media access tied to actual photo references. Kyobo actions in this file repeat the already applied request and must not be applied twice.

- Apply the enlarged KyoboD slideshow to every project detail page: uncropped large image, overlaid previous/next arrows, current/total count, and one auto-scrolling row of clickable thumbnails. This supersedes the KyoboD-only trial and earlier no-thumbnail rule. Keep public photo order and covers intact; Press keeps its existing publication layout. Reset the slideshow on project identity or publication-version changes.

## Cover follows photograph one — latest user rule

- Latest user project order (2026-11-19): KyoboD, Samjeon, Tied, ZIPZOONG, Almost Home, HEIM, Soyo, Moovboot, Change It Yourself, P HOUSE, C-at, S-house, Zagliani, Valentine, Marina Club House, HAB House 7, HAB House 1, Tied — Part 2, KyoboS, Gong Cha / Manual Design. Keep the seven unlisted projects afterward in their prior relative order: Consilience, Co-excistence, My Favorite Gwangju, Indian & Victory Showroom, Tolerance & Harmonization, Visible & Invisible, Elbon. Rename Yeonhui Seed to C-at and Gong Cha KOREA to Gong Cha / Manual Design; retain existing URLs and stable photo reference numbers. This supersedes all earlier project-order instructions. Do not change photograph order or covers as part of this project reorder.

- Request (6), final user clarification: retain through filename Tied-033 inclusive in the requested sequence (34 photographs) in Tied; convert Tied-033 to grayscale from its preserved original. Move the remaining 108 photographs to `Tied — Part 2` (`tied-part-2`), immediately after Tied. Covers follow first photographs: Tied-009 and Tied-034 respectively. Preserve stable photo references, existing deletions and low-resolution provenance. New total is 27 projects / 787 published photographs; 19 deleted review cards remain, for 806 review cards. Earlier Kyobo/Samjeon instructions repeated in request (6) are already applied and must not undo later edits.

- Samjeon-018 latest user-authorized retouch supersedes the crop-only derivative: darkened right-neighbor window interiors, removed the two left-background crosses and their entire steel towers, and dimmed distracting left storefront sign lights. Store AI-retouch provenance privately and preserve the original/crop versions. Keep the reference number, first position, and total photo count unchanged; website and review catalogs use the retouched web derivative.

- Samjeon-018 uses the user's requested tighter crop from the preserved 8256×5498 original: left 650, top 350, width 7050, height 4700; web derivative 2400×1600 WebP. Keep the entire building visible and retain the stable reference number. The earlier uncropped derivative remains private history, not an extra gallery photo.

- Every project cover must always use the first photograph in its current gallery order (`imagesIn(data)[0]`), including project cards, home selections, featured home cover, and social metadata. Review lists/PDFs identify that first photograph as the cover. This supersedes independent cover selection and the earlier Samjeon-012 cover instruction; Samjeon now uses Samjeon-018. Reordering the first photograph changes the cover automatically. Press is unchanged.

- Latest project-order revision (2026-11-19, after photo request (2)): move HAB House 7 and HAB House 1 to the very end of all 27 projects, in that order, after Elbon. Preserve every other project's relative order. Apply the same ordering to the website and all review documents. This supersedes their earlier positions before Tied — Part 2.

- Tied curation (2026-11-19): move Tied-033 from Tied to Tied — Part 2. The user's final cover selection is original Tied-034. Select three photographs per original collaboration folder, except the dancheong folder has only two and retains both: Part 2 has 38 selected photographs, Tied has 33. Keep excluded photographs in private review history as deleted. Only Tied-139 and Tied-140 receive authorized background people/backdrop cleanup; the user cancelled subsequent straightening/product-emphasis AI edits, which must not be published. Preserve original geometry, source originals, photo reference numbers, and project order.

## Latest user revisions, 2026-11-20

- Naturally retouch all published photographs in the nine projects after Gong Cha and curate their covers and photo order. Retain all currently published references; the first photograph remains the cover. Preserve project order and previously deleted review cards.
- For ordinary photographs, use the approved conventional editing approach, preserving architecture, materials, project graphics and text. Remove only extraneous frame borders or overlaid lower-edge credits when actually present. The user now permits restrained resolution enhancement; keep the original low-resolution/unverified-source classification and distinguish an enlarged derivative from a genuine high-resolution original.
- Elbon's five CG images may receive AI photorealistic material/lighting edits. Preserve original CG files and private provenance identifying the result as AI-edited visualization, not completed-project photography. Save separate correction masters and web derivatives to their corresponding Google Drive folders.
- Refresh the current public site's typography, spacing and motion in the restrained manner of Norm Architects. Keep the approved WOVN logo, English public interface, Korean administration and touching project cards. Use only fonts licensed for this site.
- The home uses three representative photographs that transition slowly. The project gallery now has large uncropped photos, previous/next arrows and a counter, without thumbnails; this supersedes the earlier thumbnail gallery rule. Preload only the next photo, wait for image decoding before transitions, support keyboard/swipe navigation, and honor reduced-motion preferences.
- Any media performance improvement must preserve current-publication authorization on every request. Browser revalidation may avoid retransmitting unchanged public derivatives; do not cache publication permission or allow a withdrawn photo to bypass access checks.

## Editorial and navigation revision, 2026-11-20

- The user now requests short English project descriptions below every project gallery. This supersedes the earlier names-and-photographs-only rule for descriptions. Keep years, locations, categories and credits hidden. Review documents contain Korean and English versions with sources and a clear distinction between press-based synthesis and newly authored editorial copy.
- Studio copy covers the practice's philosophy, services and process, drawing on verified interviews and the user's own Instagram design accounts. Preserve sourced biography; do not turn concept/CG projects into claims of completed work or introduce unverified credentials.
- Show four Press articles per page. Preserve printed text, layouts and colors in scans; use mild conventional sharpening and clearly label low-resolution/interpolated sources in the private archive. Retouched derivatives receive new immutable media IDs.
- The homepage keeps its existing three rotating photographs until the user selects new candidates. Maintain the separate 40-image and additional 20-image candidate documents and the private eight-image selection tool.
- The menu opens interactively over the current home photograph with a dark overlay and white text. Use the site's licensed Adobe Caslon Pro kit (mgk4otd), with local Cormorant Garamond fallback; do not copy another site's unlicensed font files. Primary menu typography follows the reviewed restrained proportions. Make diagonal arrows small while preserving usable hit areas, and remove unnecessary divider lines.
- Prefetch only primary navigation and links with user intent. Deduplicate server reads per render, batch card metadata, and paginate Press on the server. Never persistently cache media authorization. Reduced-motion users must retain complete content without animation.
- Existing reviewed public Studio copy may be revised through Owner/version-checked publication while preserving every operational setting exactly. This must not enable or weaken an unconfigured inquiry or mail service. Initial settings publication still requires the operational checks.
- Keep the Google Drive editing hub under 97, with a single Start document linking editable native Google Docs, bilingual PDFs, photo candidates, the existing photo review list and the Press preservation archive. Google Docs edits require a separate reviewed application to the website; they do not publish automatically.

## Typography follow-up, 2026-11-20

- The approved WOVN logo is the strongest typographic element. Main overlay navigation is now 20px on desktop and 18px on mobile, with 2px / 1.5px tracking and compact rows retaining at least 44px hit areas.
- Reduce letter spacing throughout the public site, especially uppercase labels, titles and menu text. Keep the logo artwork unchanged and preserve Korean administration typography.
- Studio should feel composed rather than empty: reduce excessive space between the introduction and philosophy sections. Present the complete Korean Studio copy to the user; the public site continues using its English counterpart.
- Public project names are uppercase on the home slideshow, cards, menu and project detail headings. Preserve internal titles, stable references and filenames.
- The user selected the recommended TOP 8 (A01–A08) for the homepage, in that order. This supersedes the temporary three-photo rule and permits specific published photographs independent of project covers. Store the reviewed selection in settings; project gallery orders and first-photo covers remain unchanged. Removed/unpublished photos must not survive in the homepage selection.
- Add concise What We Do and How We Work introductions to Studio, with corresponding Korean/English editable originals and PDFs in the existing Drive hub.
- Press must scroll continuously through all articles. This supersedes the four-article pagination request: keep the restrained card grid, remove next/previous page controls, fetch only cover metadata for the index, and lazy-load offscreen cover images. The homepage may still show a short Press selection.

## Photo-list homepage selection, 2026-11-20

- The private project photo review list also selects up to eight specific homepage photographs, starting with the currently published selection. Homepage ordering is independent of project gallery order and covers.
- Keep homepage selection and order in the browser and include the complete ordered references in the existing photo-change request download. This never publishes directly. Preserve existing project edits and deleted-photo history; a deleted photo requires an explicit restoration request before it can be selected for the homepage.
- Before regenerating the review HTML, export published selections with `scripts/export-photo-review-home.ts --production` to `.data/current-home-selection.json`; never expose operational settings or private originals in the review file.

## Anywhere editing principle — 2026-11-20

- The user's preferred workflow is continuous improvement from any location on mobile or PC. Keep stable HTTPS review links for photographs and bilingual copy, reachable from the single Google Drive Start document under 97. Core review tasks must not require a local file path or downloading desktop HTML.
- Keep the review flow simple: view photographs or text, select/order/edit or leave a note, and send a change request. Apply reviewed requests through the existing Owner/expected-version workflow; update affected website content, catalogs and Drive reference documents together, preserving source originals and change history.
- Clearly distinguish access from synchronization: `/review/home` and `/review/copy` are accessible across devices, but unfinished edits currently persist only in the browser where they were entered. Do not describe them as cloud-synced or automatically published. Any future cross-device draft storage must use authenticated, authorized access and retain the reviewed publication boundary.
