import { PublicTagPage } from "@/components/public-tag-page";
import { tagMetadata } from "@/lib/tag-metadata";

export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{token:string}>}){const {token}=await params;return tagMetadata(token,"token");}

export default async function LegacyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicTagPage code={token} lookup="token"/>;
}
