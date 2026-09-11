import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, unauthorized } from "next/navigation";
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileDraftPreview } from "@/lib/mobile-draft-preview";
import { PublicProfile } from "@/components/public-profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export default async function MobileDraftPreviewPage({ params, searchParams }: {
  params: Promise<{ profileId: string }>; searchParams: Promise<{ templateId?: string }>;
}) {
  const user = await getMobileUser(new Request("https://pop.popwam.com/mobile-preview", { headers: await headers() }));
  if (!user) unauthorized();
  const [{ profileId }, query] = await Promise.all([params, searchParams]);
  let result;
  try { result = await mobileDraftPreview(user.id, profileId, query.templateId || ""); }
  catch { notFound(); }
  return <div data-draft-revision={result.draftRevision}><PublicProfile profile={result.preview} ownerId={user.id}/></div>;
}
