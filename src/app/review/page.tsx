import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "홈페이지 편집·자료실",
  description: "휴대폰과 컴퓨터에서 함께 쓰는 WOVN 사진·글·PDF 자료실",
  robots: { index: false, follow: false },
};

const editors = [
  {
    title: "프로젝트 사진",
    href: "/review/photos",
    description: "사진 순서, 삭제·복원 요청과 보정 메모",
  },
  {
    title: "메인 사진",
    href: "/review/photos?view=home",
    description: "첫 화면에 사용할 8장 선택과 순서 변경",
  },
  {
    title: "프로젝트 글",
    href: "/review/copy?kind=project",
    description: "작품별 한글·영문 읽기와 수정 요청",
  },
  {
    title: "Studio 글",
    href: "/review/copy?kind=studio",
    description: "모토, 철학, 서비스와 일하는 방식",
  },
  {
    title: "Journal 글",
    href: "/review/copy?kind=journal",
    description: "일상과 공간에 관한 한글·영문 에세이",
  },
  {
    title: "Press 지면",
    href: "/press",
    description: "보도자료와 잡지 지면을 이어서 보기",
  },
];

const manuscripts = [
  ["프로젝트 한글·영문 원고", "1KIcYGQkzSYJ7SRoVm2dYLnjy7frXhh702dqNpxAnF3w"],
  ["Studio 한글·영문 원고", "1WXaqJGRA2nfU6VIeuW3qEI3YFJBW-KSgcwKXP6cTDUM"],
  ["Journal 한글·영문 원고", "1v2pN1_NWcS_5kzHx1vVQa371bs8lc6bNL8hQv4igFwk"],
  ["Journal 후보와 편집 메모", "17VxKiRuazl-qU66y9TY5QklehFn0xpm13DrVaVhyTTY"],
];

const documents = [
  ["프로젝트 글 목록표", "한글·영문 PDF", "10tUWwA0m6tFyfLVS9xyqXah9Id9E6f9g"],
  ["Studio 글 목록표", "한글·영문 PDF", "1UzlmF2dO-wdtMWnMuEC_EfjnyvYB2MK5"],
  [
    "프로젝트 사진 목록표",
    "사진·삭제 보관 기록 PDF",
    "1n-_Z6NbZ-9bngEWFMLHDciigwgmYIXMj",
  ],
  ["메인 사진 기본 후보 40장", "후보 PDF", "1iqlEt-52MPxiehQQ1ZB1nd7Uop_ucr85"],
  ["메인 사진 추가 후보 20장", "후보 PDF", "1AQ6yUCL5BcMvm4ehvMXSQ76516lrpvu9"],
  [
    "처음 추천한 메인 사진 8장",
    "한 장으로 비교하기",
    "1JDn32xv4sWPbI4-pJkg0Qu2da9HQ6bgE",
  ],
];

export default function ReviewHome() {
  return (
    <main lang="ko" className={styles.page}>
      <header className={styles.header}>
        <Link href="/" prefetch={false} aria-label="WOVN 홈페이지">
          <img
            src="/brand/wovn-studio.svg"
            width="112"
            height="40"
            alt="WOVN STUDIO"
          />
        </Link>
        <p className={styles.eyebrow}>휴대폰 · 태블릿 · 컴퓨터 공용</p>
        <h1>홈페이지 편집·자료실</h1>
        <p>
          사진을 고르고, 글을 읽고, 바꿀 내용을 남기는 곳입니다.
          <br />이 주소를 즐겨찾기해 두고 어디서든 시작하세요.
        </p>
      </header>

      <nav className={styles.editors} aria-label="사진과 글 편집">
        {editors.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={styles.card}
          >
            <span className={styles.cardTitle}>
              {item.title}
              <span aria-hidden="true">→</span>
            </span>
            <span className={styles.description}>{item.description}</span>
          </Link>
        ))}
      </nav>

      <section className={styles.guide} aria-labelledby="review-how">
        <h2 id="review-how">다른 기기에서도 이어서</h2>
        <p>
          사진·글 편집 내용은 현재 브라우저에 저장됩니다. 다른 기기로 옮길 때는{" "}
          <strong>이어하기 파일 저장</strong> 후 같은 편집 화면에서{" "}
          <strong>이어하기 파일 불러오기</strong>를 누르세요.
        </p>
        <p>
          수정을 마치면 요청서를 만들어 이 대화로 보내주세요. 원고와 사진은 검토
          후 홈페이지에 반영합니다.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="review-manuscripts">
        <h2 id="review-manuscripts">구글 원고에서 직접 수정</h2>
        <p>
          같은 Google 계정으로 열면 기기를 바꿔도 문서 수정 내용이 이어집니다.
          편집 후 반영할 부분을 이 대화에 알려주세요.
        </p>
        <ul className={styles.list}>
          {manuscripts.map(([label, id]) => (
            <li key={id}>
              <a
                href={`https://docs.google.com/document/d/${id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="review-documents">
        <h2 id="review-documents">PDF와 사진 자료</h2>
        <p>
          휴대폰과 컴퓨터에서 같은 파일을 엽니다. PDF는 저장·인쇄용 기록이며,
          최신 사진과 글은 위 편집 화면에서 확인하세요.
        </p>
        <ul className={styles.list}>
          {documents.map(([label, detail, id]) => (
            <li key={id}>
              <a
                href={`https://drive.google.com/file/d/${id}/view`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  {label}
                  <small>{detail}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          구글 원고와 보관 자료는 기존에 접근 권한이 있는 Google 계정으로
          열어주세요.
        </p>
      </section>

      <footer className={styles.footer}>
        <a
          href="https://docs.google.com/document/d/1aQGq5IxoIGbds06hO9QmsO7M8-B7Lk2X-qlrP1-J0Uo/edit"
          target="_blank"
          rel="noopener noreferrer"
        >
          구글드라이브 시작 문서·전체 자료실 ↗
        </a>
        <Link href="/" prefetch={false}>
          홈페이지 보기 →
        </Link>
      </footer>
    </main>
  );
}
