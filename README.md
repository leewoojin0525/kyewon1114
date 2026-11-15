# WOVN STUDIO

PRD에 따른 공개 포트폴리오와 한국어 콘텐츠 관리자입니다. 모든 구현·자료·로컬 데이터는 이 프로젝트 폴더에 저장합니다. 무료 Vercel·Neon 구성으로 https://kyewon1114.vercel.app 에 배포했습니다. 별도 사용자 도메인의 DNS·MX는 변경하지 않았습니다.

## 바로 열기

현재 프로젝트 29개 중 실제 사진이 있는 22개가 발행되어 있으며 공개 프로젝트 사진은 265장입니다. Ability·Cross-stitch는 사용자 요청으로 비공개, CG·모형 중심 5개도 초안으로 보관합니다. 188쪽 PDF의 438개 추출 자산과 Drive 추가 원본은 `assets/`에 있습니다. Press에는 실제 게재물 82건과 지면342장이 연결되어 있습니다. 중복2건과 매체 미확인2건은 원본 아카이브에 보관합니다. 최신 수량은 `docs/content-status.json`을 확인하세요.

공개 사이트 전체는 영어, 관리자는 한국어입니다. 삼전동은 두 번째, 공차는 마지막이며 HEIM과 Tied의 순서를 교환했습니다. 교보의 공개 이름은 KYOBO HOTTRACKS / Manual Design이며 원래 첫 표지를 유지합니다. 연혁의 영문 표기를 교정하고 Profile archive 링크를 삭제했습니다. 여의도는 최종23장으로 교체하고 S-house로 이름을 변경했습니다. 씨앗은 새 사진22장으로 교체했습니다. 삼전동 대표사진은 가로형 저녁 전경입니다.

후속 사용자 요청에 따라 공개 프로젝트는 **이름과 사진만** 보여 줍니다. 연도·용도·위치·설명·디자인 담당·회사·사진 제공·용도 필터를 화면에서 제거했습니다. 사진 사이 간격은 0px이고, 제목은 로고보다 작습니다. 원문 사실과 권리 확인은 관리자·아카이브에 보존합니다. 사진 확대는 이미지를 눌러 사용할 수 있으며 별도 ‘사진 확대’ 글자와 중복 썸네일은 없습니다.

- 운영 화면: https://kyewon1114.vercel.app (관리자 `/admin`, 초기 접속 정보 `.data/production-access.json`)
- 로컬 공개 화면: http://127.0.0.1:3000
- 관리자: http://127.0.0.1:3000/admin
- 현재 생성된 로컬 계정: `.data/local-access.json` (파일 권한 600, Git 제외). 대표와 직원의 비밀번호는 개별 무작위 생성값입니다. 운영에서 사용하면 안 됩니다.
- 앱·DB·작업자를 한 번에 실행: `bash scripts/run-local.sh`

이미 별도 터미널에서 같은 서버가 실행 중이면 중복 실행하지 마세요. 서버를 종료해도 `.data/postgres`, `.data/media`는 유지됩니다.

## 환경과 설치

Node.js 24.x(로컬 검증24.22.1), pnpm 11.25.0을 사용합니다. Next.js 16.4.6 / React 19.3.1 / Payload 3.93.0을 잠금 파일로 고정했습니다. 로컬 PostgreSQL은 18.6 바이너리를 개발용 `embedded-postgres` 도구로 실행합니다. 이 보조 도구는 beta 버전이며 운영 DB에는 사용하지 않습니다.

이 Mac에 시스템 Node가 없으면 Codex 번들 런타임을 사용할 수 있습니다.

```bash
export PATH="/Users/leewoojin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PATH="/Users/leewoojin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
pnpm install --frozen-lockfile
pnpm local:setup
pnpm local:db
```

새 터미널에서 최초 스키마와 개별 계정을 준비합니다.

```bash
pnpm db:migrate
pnpm cms:migrate
pnpm local:accounts  # 로컬 전용 시험 계정. 운영에서는 실행 금지.
pnpm dev
```

다른 터미널에서 `pnpm worker`를 실행합니다. 최초 운영 대표 계정은 `pnpm owner:create`에서 이름·이메일·숨김 비밀번호 입력으로 생성합니다. 공개 회원가입이나 기본 비밀번호는 없습니다. `.env`의 비밀값을 Git·채팅에 복사하지 마세요.

## 구현 구조

- `src/app/(site)`: Home / Projects / Studio / Press / Contact / Privacy (`/journal`은 `/press`로 리디렉션).
- `src/components/admin.tsx`: 한국어 작업실, 다섯 가지 본문 블록, 순서·사진·초점·메타정보 편집.
- `src/payload.config.ts`: Payload의 계정 인증, 비밀번호 해시, 잠금, 세션, Owner/Editor 접근 제어. 인증 관련 이메일의 콘솔 출력은 비활성화했습니다.
- `src/lib/content.ts`: PostgreSQL의 불변 버전·공개본 분리와 트랜잭션 게시 절차. Payload 기본 공개 버튼을 우회할 수 없도록, 전용 관리자와 제한된 API를 사용합니다. 범용 Payload REST/GraphQL/최초 가입 경로는 노출하지 않습니다.
- `src/lib/inquiries.ts`: 검증·동의·속도 제한·중복 방지·트랜잭션 outbox·알림 작업자·12개월 보유 기간 삭제.
- `src/lib/media.ts`: 실제 디코딩 검증, 방향 보정, EXIF 제거, WebP 파생본, 로컬/S3/Vercel Blob 비공개 저장.
- `migrations/`, `src/cms-migrations/`: 앱 스키마와 Payload 스키마의 재현 가능한 마이그레이션. `CMS_SCHEMA_PUSH=false` 유지.
- `assets/`: 포트폴리오 추출 자료. `public/` 밖에 있어 웹에서 직접 접근할 수 없습니다.
- `.data/`: 로컬 DB·미디어·시험 계정. `.backups/`: 로컬 백업. 모두 Git 및 Docker 빌드에서 제외합니다.

## 게시 방법

1. 대표가 직원 계정을 생성합니다. 개별 계정을 사용합니다.
2. 사진 보관함에서 JPEG/PNG/WebP를 등록합니다. 한 번에 20개, 한 장당 25MB까지 지원하며 실패한 파일만 재시도할 수 있습니다.
3. 프로젝트 초안에 이름·사진·대체 텍스트와 사용 권리 확인을 입력합니다. 잡지 게재에는 매체명·호수·요약과 실제 지면을 넣으며 한 장짜리 기사도 등록할 수 있습니다. 본문은 큰 사진 / 두 사진 / 글 / 인용 / 사실·크레딧으로 구성합니다. 글은 문단, `- 목록`, `[링크](https://...)`를 지원합니다.
4. 저장된 버전의 미리보기를 확인하고 검토를 요청합니다. 직원은 공개·비공개·복구·문의 조회·계정 관리를 할 수 없습니다.
5. 대표가 확인한 버전을 공개 적용합니다. 검토 후 다른 수정이 저장되면 409 충돌로 차단합니다. 공개된 글을 수정해도 승인 전에는 기존 공개본이 유지됩니다.
6. 이전판은 해당 버전 미리보기에서 확인한 뒤 복구합니다. 복구는 새로운 버전과 발행 이력으로 기록합니다.
7. 홈·스튜디오·연락처도 초안과 최종 공개를 분리합니다. 비공개가 된 대표작은 다음 공개 선별작으로 안전하게 전환합니다.

이미지 파일은 불변입니다. 공개 캡션과 대체 텍스트는 게시 버전에 포함됩니다. 사용 중인 사진은 과거 버전의 복구를 위해서도 삭제가 제한됩니다. 원본 다운로드 경로는 제공하지 않습니다.

## 문의와 메일

문의와 알림 작업은 하나의 DB 트랜잭션으로 저장합니다. 저장 후 실제 접수번호를 반환합니다. 같은 제출 키는 같은 결과를 반환하고, 다른 내용으로 재사용하면 거부합니다.

지속 실행 작업자는 15초마다 대기열을 실행합니다. 최초 실패 후 1분·5분·30분으로 총3회 재시도하고 이후 대표가 재시도를 요청할 수 있습니다. 무료 Vercel 구성은 요청 후 처리와 하루 한 번 예약 실행을 사용하므로 이 재시도 간격은 보장하지 않습니다. 현재 운영 문의는 실제 연락처·메일·개인정보 안내 연결 전까지 비활성화돼 있습니다. 공급자에는 문의 ID 기반 멱등 키를 보냅니다. 여러 작업자의 동시 실행은 행 잠금과 lease로 제어합니다.

`MAIL_ADAPTER=test`는 **테스트 보관·실제 미발송** 상태입니다. 실제 메일은 `resend`, 검증된 발신자, 수신자, 키, `ALLOW_EXTERNAL_MAIL=true`가 모두 연결되어야 합니다. 알림에는 접수번호·유형·접수 시각·관리자 링크만 포함합니다. 문의 본문·연락처는 대표가 로그인한 관리자에서 확인합니다.

## 검증과 운영

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm backup
node --import tsx scripts/restore-check.ts
pnpm release:check
```

통합 시험은 임시 PostgreSQL DB를 만들고 시험 후 제거합니다. 로컬 DB 사용자는 `CREATEDB` 권한이 있어야 합니다. 실제 운영 계정으로 시험하지 마세요. Payload의 재연결용 연결과 테스트 런타임 핸들 때문에 시험 종료는 Node의 `--test-force-exit`를 사용하지만 DB·파일 정리는 종료 전에 검증합니다.

상세 절차와 남은 연결 항목은 `docs/operations.md`, 실제 검수 범위는 `docs/acceptance.md`, 사진 출처와 사용자 확인은 `docs/portfolio-candidate-review.md` 및 전체 추출 보고서를 확인하세요.

## 기술 참고

[Payload 설치](https://payloadcms.com/docs/getting-started/installation), [Local API 접근 제어](https://payloadcms.com/docs/local-api/access-control), [PostgreSQL](https://payloadcms.com/docs/database/postgres), [Next.js 메타데이터](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [Resend 멱등 요청](https://resend.com/docs/dashboard/emails/idempotency-keys). 현재 설치 패키지의 타입·구현과 `node_modules/next/dist/docs/`도 함께 확인했습니다.
