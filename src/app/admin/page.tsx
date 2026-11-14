import { Admin } from "@/components/admin";
export const metadata = {
  title: "콘텐츠 관리",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div lang="ko">
      <Admin />
    </div>
  );
}
