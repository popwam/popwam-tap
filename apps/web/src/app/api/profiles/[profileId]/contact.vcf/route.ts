import { publicProfileVCardResponse } from "@/lib/public-profile-vcard";

export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  return publicProfileVCardResponse(profileId);
}
