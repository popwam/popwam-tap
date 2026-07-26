import { getCurrentPopUser, isTrustedPopMutation, csrfRejected, unauthorized } from "@/lib/api-auth";
import { acceptRequiredLegalConsentForBootstrap, getProfileBootstrapStatus } from "@/lib/profile-bootstrap";

const localeFrom = (value: unknown) => value === "ar" ? "ar" : "en";
const documentPath = (type: string) => type === "PRIVACY" ? "/privacy" : "/terms";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const status = await getProfileBootstrapStatus(user.id, localeFrom(new URL(request.url).searchParams.get("locale")));
  return Response.json({ ok: true, legalReady: status.legalReady, legalAccepted: status.legalAccepted, documents: status.requiredDocuments.map((document) => ({ ...document, path: documentPath(document.documentType) })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.accepted !== true) return Response.json({ ok: false, error: "LEGAL_CONSENT_REQUIRED" }, { status: 400 });
  try {
    const result = await acceptRequiredLegalConsentForBootstrap(user.id, localeFrom(body.locale));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "LEGAL_DOCUMENTS_UNAVAILABLE" }, { status: 409 });
  }
}
