import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { updateShareProduct } from "@/lib/share-center";

export async function PATCH(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  const locale = body.locale === "ar" ? "ar" : "en";
  try {
    const product = await updateShareProduct(user.id, cardId, {
      action: body.action,
      profileId: typeof body.profileId === "string" ? body.profileId : undefined,
      targetId: typeof body.targetId === "string" ? body.targetId : undefined,
      status: body.status,
      locale,
    });
    return Response.json({ ok: true, product });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PRODUCT_UPDATE_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "PRODUCT_NOT_FOUND" ? 404 : 400 });
  }
}

