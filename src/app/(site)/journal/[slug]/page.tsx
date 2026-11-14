import { permanentRedirect } from "next/navigation";
export default async function JournalRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  permanentRedirect(`/press/${(await params).slug}`);
}
