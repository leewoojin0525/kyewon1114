import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { getDraft } from "@/lib/content";
import { Detail } from "@/components/editorial";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "비공개 미리보기",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  try {
    await authenticate(await headers());
  } catch {
    notFound();
  }
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { version } = await searchParams;
  const doc = await getDraft(id, version ? Number(version) : undefined);
  if (doc.kind === "settings")
    return (
      <main className="wrap section">
        <h1>설정 초안 미리보기</h1>
        <pre>{JSON.stringify(doc.data, null, 2)}</pre>
      </main>
    );
  return <Detail doc={{ ...doc, published_at: doc.version_date }} preview />;
}
