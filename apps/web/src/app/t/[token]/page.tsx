import { PublicTagPage } from "@/components/public-tag-page";

export const dynamic = "force-dynamic";

export default async function LegacyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicTagPage code={token} lookup="token"/>;
}
