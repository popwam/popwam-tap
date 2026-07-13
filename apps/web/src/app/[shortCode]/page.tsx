import { notFound } from "next/navigation";
import { RESERVED_SHORT_CODES } from "@popwam/shared";
import { PublicTagPage } from "@/components/public-tag-page";
import { tagMetadata } from "@/lib/tag-metadata";

export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{shortCode:string}>}){const {shortCode}=await params;return tagMetadata(shortCode.toLowerCase(),"shortCode");}

export default async function ShortCodePage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const code = shortCode.toLowerCase();
  if (RESERVED_SHORT_CODES.has(code)) notFound();
  return <PublicTagPage code={code}/>;
}
