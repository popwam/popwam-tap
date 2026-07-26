import { getCurrentPopUser, isTrustedPopMutation, csrfRejected, unauthorized } from "@/lib/api-auth";
import {
  createQuotaIncreaseRequest,
  parseQuotaRequestedValue,
  quotaUsageForUser,
  supportedQuotaResources,
} from "@/lib/quota-requests";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  return Response.json({ ok: true, ...(await quotaUsageForUser(user.id)) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({})) as { resource?: unknown; requestedValue?: unknown; reason?: unknown };
  const resource = typeof body.resource === "string" && supportedQuotaResources.includes(body.resource as never)
    ? body.resource as "MAX_STORAGE_BYTES" | "MAX_LINKS"
    : null;
  const requestedValue = resource ? parseQuotaRequestedValue(resource, body.requestedValue) : null;
  if (!resource || requestedValue === null) return Response.json({ ok: false, error: "QUOTA_REQUEST_INVALID" }, { status: 400 });
  try {
    const result = await createQuotaIncreaseRequest({
      userId: user.id,
      resource,
      requestedValue,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    return Response.json({
      ok: true,
      request: { id: result.request.id, resource: result.request.resource, status: result.request.status },
      idempotent: result.idempotent,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "QUOTA_REQUEST_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "QUOTA_REQUEST_NOT_INCREASE" ? 409 : 503 });
  }
}
