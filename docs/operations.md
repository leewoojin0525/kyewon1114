# 운영과 인계

## 현재 사진 운영 기준 (2026-11-19)

- 현재 사진 구성은 26개 작품 / 691장입니다. 검증된 고용량 원본에서 재변환한 17개 작품 531장과 기존 사진을 보존한 9개 작품 160장으로 구성합니다. KyoboD와 KyoboS는 별도 작품입니다.
- 현재 목록의 단일 기준 파일은 비공개 `.data/current-photo-catalog.json`입니다. `scripts/create-photo-review.py`와 `scripts/create-photo-catalog.py`는 이 파일로 현재 사진만 출력합니다. 과거 제외 목록이나 908장 초기 목록을 합치지 않습니다.
- 현재 표시용 파일은 Git에서 제외된 `.site-media/manifest.json`과 비공개 배포 번들로 제공합니다. 공개 여부는 여전히 DB의 현재 발행 참조로 검사합니다. 원본과 묶음 파일 자체는 공개하지 않습니다.
- Git 자동 배포는 비활성화돼 있습니다. 배포할 때 현재 `.site-media`를 반드시 포함합니다. 초기 `prepare-bundled-media.mjs`는 과거 목록 기준이므로 그대로 재실행하면 새 사진 6장이 누락됩니다. 새 파일은 현재 매니페스트에 검증하여 추가해야 합니다.
- 원본 확인과 변환·게시 기록은 비공개 `.data/rebuild-all-20261119/`에 있습니다. 웹용 파일은 `assets/website-rebuild-20261119/`, 현재 목록 PDF·HTML·CSV는 `output/`에 보관합니다. 원본은 삭제하지 않습니다.
- 사진 한 장만 있는 작품도 대표사진만으로 발행할 수 있습니다. Owner 권한, 예상 버전, 권리 확인, 대체 텍스트, 실제 미디어 존재 검증은 동일하게 적용됩니다.
- 무료 구성을 유지합니다. Blob 요청 한도 문제로 사진 제공 경로를 배포 번들로 옮긴 상태이므로, 확인 없이 초기 Blob 업로드·이관 스크립트를 반복 실행하지 않습니다.

## 최초 Vercel 구성 기록 (2026-11-14)

- GitHub: `leewoojin0525/kyewon1114`, Vercel 팀/프로젝트: `lwja/kyewon1114`.
- 운영 주소: `https://kyewon1114.vercel.app`, 관리자: `/admin`. Node 24와 `ENABLE_EXPERIMENTAL_COREPACK=1`로 저장소의 pnpm 버전을 사용합니다.
- 사용자가 무료 구성을 선택했습니다. Neon Free PostgreSQL과 Vercel Hobby의 비공개 Blob 저장소를 사용하며 유료 전환은 하지 않습니다.
- `.data/production-runtime.env`는 배포·이관 전용 비밀 파일이며 Git에 포함하지 않습니다. 운영 앱은 Vercel 환경 변수를 사용합니다. 로컬 `.env`와 로컬 DB는 유지합니다.
- `prepare-deployment-media.ts`는 검증한 백업을 별도 배포 사본으로 만듭니다. 표시용 최대 크기와 960px 반응형 파일을 유지하고, 큰 PNG 원본은 픽셀 일치 확인을 거쳐 무손실 WebP로 저장합니다. 로컬 원본·백업과 모든 사진·콘텐츠 수정 이력은 보존합니다. 배포 사본에서 로컬 시험 문의·세션을 제외하고 시험 계정을 비활성화합니다.
- Vercel의 요청 본문 제한에 맞춰 관리자 사진은 인증 후 짧게 유효한 업로드 권한으로 비공개 저장소에 직접 전송합니다. 서버에서 파일 형식·25MB 한도·픽셀 수를 다시 검사한 뒤 공개 가능한 파생본을 생성합니다. 미완료 임시 업로드는 자동 만료됩니다.
- 무료 요금제에서는 문의 직후 처리를 시도하고 하루 한 번 예약 작업을 실행합니다. 지속 실행 작업자의 1·5·30분 단위 재시도 시간은 보장하지 않습니다. 실제 메일 발송과 개인정보 안내가 연결되기 전에는 운영 문의 접수가 차단됩니다.
- 초기 데이터 복원은 앱 스키마 `public`/`cms`가 비어 있는 새 DB에서만 허용합니다. Neon이 관리하는 `neon_auth` 스키마는 변경하지 않습니다.
- 중단된 미디어 업로드는 `UPLOAD_PRIORITY_PROJECT=samjeon-165-18 node --import tsx scripts/upload-deployment-media.ts`처럼 프로젝트를 우선 지정해 재개할 수 있습니다. 실제 저장소와 체크포인트를 함께 검사하며 기존 파일을 덮어쓰지 않습니다.
- 최초 이관 자료: 프로젝트 22건, Press 82건. 배포 미디어 1,704파일 / 905,175,533바이트로, 로컬 원본 기준 358,645,294바이트를 절약했습니다. 공개 사진 삭제는 없습니다.
- 운영 대표 계정은 별도로 활성화하고 로그인까지 확인했습니다. 초기 접속 정보는 Git에서 제외한 `.data/production-access.json`에만 저장합니다. 로컬 시험 계정은 운영에서 비활성화했습니다.

## 추가 운영 설정

- `wovn.kr` 소유·DNS와 기존 `www.lwj.co.kr`·메일 MX 영향 확인. 이 작업에서 DNS·MX를 변경하지 않았습니다.
- 검증된 업무 이메일 및 실제 수신자. PRD의 `wj@wovn.kr`은 희망 주소이며 수신 가능성을 확인하지 않아 공개 연락처로 넣지 않았습니다.
- 실제 메일 수신을 사용하려면 검증된 Resend 발신 도메인과 업무 수신자를 연결합니다. DB·호스팅·비공개 저장소·대표 계정은 위 Vercel 구성에 연결되어 있습니다.
- 추출한 로고가 최신 승인 마스터인지 확인. 기존 PDF와 벡터의 일치는 검증했습니다.
- 실제 처리 업체·처리 위치·위탁·국외 처리 해당 여부와 문의 보관 기간을 개인정보 안내에 확정.

고정 비용이나 무료 운영을 약속하지 않습니다. 호스팅·DB·S3/R2 저장/전송·메일·백업·작업자의 계정과 요금제가 정해진 뒤 해당 계정의 가격으로 운영비를 산정해야 합니다.

## Node 운영 배포

이 앱은 Node/PostgreSQL/S3 구성이므로 현재 Sites의 Cloudflare Worker 배포물로 변환하지 않았습니다. 제공된 Dockerfile/Compose는 운영 준비용이며 이 Mac에는 Docker가 없어 컨테이너 빌드 자체는 미검증입니다. Next.js 운영 빌드는 직접 검증했습니다.

1. `.env.example` 기준으로 비밀 관리 시스템 또는 `.env.production.local`에 실제 값을 연결합니다. `APP_ENV=production`, `APP_URL=https://실제도메인`, `CMS_SCHEMA_PUSH=false`, `STORAGE_DRIVER=s3`를 사용합니다.
2. PostgreSQL을 만들고 앱 데이터 마이그레이션과 CMS 마이그레이션을 1회 실행합니다. 배포 중에는 백업을 먼저 확보합니다.
3. Node 앱과 `scripts/worker.ts`를 각각 지속 실행 서비스로 올립니다. Compose 예시는 두 서비스를 분리했습니다. PostgreSQL은 영구 볼륨, 미디어는 외부 비공개 객체 저장소입니다.
4. 최초 대표 계정을 숨김 입력 CLI로 생성합니다. 콘텐츠를 등록·검토하고 발행합니다.
5. TLS 종단 프록시에서 앱의 3000 포트로 전달합니다. 업로드는 한 요청 최대 25MB + 작은 헤더 여유, 요청 시간 제한을 설정합니다. 서버는 한 요청 한 파일만 받습니다.
6. 기본 `TRUST_PROXY=false`는 클라이언트 IP 헤더를 신뢰하지 않고 공통 네트워크 제한을 적용합니다. 프록시가 기존 `X-Real-IP`를 반드시 제거하고 실제 IP로 재작성할 때만 `true`로 바꿉니다. 제한 키는 DB에 HMAC으로 저장합니다.
7. 문의를 실제 수신 계정으로 시험하고 관리자에서 `발송 완료`를 확인합니다. 수신함 도착도 별도 확인합니다. 공급자 장애 후 복구·재시도를 시험합니다.
8. `pnpm release:check`와 실제 공개 콘텐츠·모바일·브라우저·복원·성능 검수를 통과한 뒤 DNS를 전환합니다. 기존 MX 기록을 보존합니다.

로컬에서는 디스크 저장을 사용하지만 `APP_ENV=production`에서는 로컬 미디어 저장을 거부합니다. 개발용 환경을 공개 서버에서 그대로 사용하면 안 됩니다.

## 백업·복원

`pnpm backup`은 트랜잭션 스냅샷의 앱/CMS 테이블, 계정 해시, 불변 미디어 원본과 파생본을 `.backups/<UTC시각>`에 저장합니다. DB JSON 및 각 이미지의 SHA-256, 외래 키 순서, 시퀀스 정보를 포함합니다. 비밀번호 원문·환경 변수는 백업하지 않습니다. 백업은 계정 해시·문의 개인정보를 포함할 수 있으므로 접근 통제·암호화된 별도 저장소·보유 기간이 필요합니다.

```bash
# 값은 안전하게 환경에 주입합니다. 명령줄 인자로 비밀번호를 넘기지 않습니다.
pnpm backup
# RESTORE_DATABASE_URL: 새로 만든 빈 DB, RESTORE_MEDIA_DIRECTORY: 새 빈 로컬 폴더
pnpm restore .backups/선택한백업폴더
```

현재 DB 또는 미디어 경로 덮어쓰기는 거부합니다. 별도 환경 복원 후 표 개수/행 수, 대표 로그인, 공개본/초안, 사진, 문의 상태를 확인한 다음 운영 전환합니다. 복원된 알림 작업자는 검증이 끝날 때까지 `MAIL_ADAPTER=test`로 둡니다. 재발송 중복 여부를 공급자 기록과 대조합니다.

운영에서는 DB 서비스의 PITR/스냅샷과 객체 저장소 버전 관리·별도 백업을 추가합니다. 제공된 논리 백업 스크립트는 현재 앱의 초기 스키마용입니다. 이후 CMS 마이그레이션을 추가하면 백업의 schema 생성도 함께 확장하고 복원 시험을 다시 해야 합니다. 대용량 장기 운영에서는 `pg_dump`/관리형 백업을 주 백업으로 사용합니다.

`scripts/restore-check.ts`는 최근 백업을 별도 임시 DB·사진 폴더에 복원하여 행 수·미디어 체크섬·대표 로그인·초안 사진 조회를 검사한 뒤 시험 환경을 정리합니다. 이 개발 환경에서 실제 실행했습니다.

## 오류 처리

- 문의 저장 장애: 성공 표시 금지, 입력 유지, 동일 키로 재시도. 확인된 이메일이 있으면 대체 연락 링크 제공.
- 알림 실패: 문의를 삭제하지 않음. 1·5·30분 재시도 후 대표에게 실패 상태 표시. 테스트 보관은 실제 발송으로 오인하지 않도록 구분.
- 작업자 중단: 관리자 마지막 heartbeat 확인, 서비스 재기동. lease 만료 작업을 회수.
- 발행 충돌: 최신 초안을 다시 확인하고 명시적으로 적용. 기존 공개본 유지.
- 공개 철회: 현재 공개 참조를 제거하여 새 미디어 접근을 차단. 이미 사용자가 저장한 사본은 회수할 수 없음.
- 계정 중지/역할 변경/비밀번호 재설정: 기존 세션을 종료. 직원은 문의 기본 접근 불가.

운영 로그에 문의 원문·연락처·토큰·DB 매개변수를 출력하지 않도록 애플리케이션 오류를 일반화했습니다. 프록시·호스팅 로그에도 본문 수집을 켜지 마세요.
# Offline originals and web media

The 2026-11-18 storage maintenance keeps immutable media rows and historical
publication snapshots. Duplicate high-resolution originals are archived privately
on the archive host; published and historical display derivatives remain in Blob.
`w_media_archives` records the archive ID, original key, exact byte count, and
SHA-256 digest. Never delete the last verified archive copy.

Run production backups on the archive host, with `ORIGINAL_ARCHIVE_DIRECTORY`
pointing to `.data/original-archives` or a verified copy. `pnpm backup` validates
archived originals and includes their full bytes in the backup. It intentionally
fails if an archive is absent or damaged. Local restored backups contain those
originals in the restored media directory and do not require an archive mount.

Web-only imports may use the same immutable WebP object as their uploaded web
master and display derivative. Backup code deduplicates these keys. The source
camera/portfolio original remains in the separate private source archive.

The maintenance plan, source matching, upload checksums, publication versions,
and final public-image verification are stored privately under
`.data/photo-replacement-20261118`. The photo reference numbers in its plan are
stable identifiers; do not renumber them when changing display order.

The full photo-library import can store immutable WebP files in private,
content-addressed bundles to reduce Blob upload operations. Each derivative keeps
its public logical key and a private `packed` byte-range descriptor. The media
route checks current publication access before reading the exact range, and
checks its SHA-256 digest before serving it. Bundle keys are never public routes.
Backups copy each physical bundle once; restores preserve the same layout.
Cloud upload skips originals already held in the verified offline archive.


### Bundled display media during the Blob free-tier suspension

On 2026-11-18 Vercel suspended Blob after the 2,000 monthly Advanced Operations allowance was used. This is separate from storage capacity. The account remains Hobby; no paid upgrade was made. The provider reports automatic recovery on 2026-12-18 at14:04KST.

The media GET route first reads verified immutable derivatives from `.site-media/`. These files are included only in the server function trace and are never in `public/` or the public Git repository. The normal database publication/authentication check runs before every image read. An unpublish immediately blocks anonymous access even when the file remains in the deployment. Originals are excluded. SHA-256 validates each returned photo/range. Uploads still use Blob and are unavailable while the provider has suspended it.

Prepare the reviewed full-photo library with `node scripts/prepare-bundled-media.mjs` on the archive host, then run typecheck, tests and build. Deploy from that host using the authenticated Vercel CLI, verify the staged production build, then promote it. The production build fails if the private manifest is missing. Git auto-deploy is disabled because the public repository deliberately excludes these private display files; pushing source alone must not replace a working media deployment. Source commits remain on GitHub.

The preparation requires the private plan in `.data/full-library-20261118/plan.json`, verified source files, and current Press media mirrored under `.data/verified-backup-media-20261118`. Refresh the plan and verified mirror for future photo changes. Keep the separate full database/media backups; the display bundle is not a backup of originals. Existing Blob reads remain available as a fallback for media added after suspension ends.
