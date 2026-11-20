import styles from "./review.module.css";

export default function LoadingCopyReview() {
  return (
    <main lang="ko" className={styles.page}>
      <h1>글 읽기·수정 요청</h1>
      <p role="status">원고를 불러오고 있습니다.</p>
    </main>
  );
}
