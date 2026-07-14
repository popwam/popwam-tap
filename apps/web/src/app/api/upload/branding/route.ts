import { revalidatePath } from "next/cache";
import { prisma } from "@popwam/db";
import { createStorageKey, isStorageEnabled, uploadPublicImage, validateImageUpload } from "@popwam/storage";
import { csrfRejected, getApiUser, isSameOriginMutation, unauthorized } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";

const assetFields = {
  mainLogo: ["mainLogoUrl", "mainLogoStorageKey"], lightLogo: ["lightLogoUrl", "lightLogoStorageKey"], darkLogo: ["darkLogoUrl", "darkLogoStorageKey"],
  appIcon: ["appIconUrl", "appIconStorageKey"], favicon: ["faviconUrl", "faviconStorageKey"], appleTouchIcon: ["appleTouchIconUrl", "appleTouchIconStorageKey"],
  pwaIcon192: ["pwaIcon192Url", "pwaIcon192StorageKey"], pwaIcon512: ["pwaIcon512Url", "pwaIcon512StorageKey"], defaultOgImage: ["defaultOgImageUrl", "defaultOgImageStorageKey"],
} as const;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const user = await getApiUser();
  if (!user) return unauthorized();
  if (!isAdminRole(user.role)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!isStorageEnabled()) return Response.json({ error: "R2_NOT_CONFIGURED" }, { status: 503 });
  try {
    const body = await request.formData();
    const asset = String(body.get("asset") || "") as keyof typeof assetFields;
    const file = body.get("file");
    if (!assetFields[asset] || !(file instanceof File)) return Response.json({ error: "INVALID_BRANDING_ASSET" }, { status: 400 });
    const validation = validateImageUpload({ filename: file.name, contentType: file.type, size: file.size });
    if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
    const key = createStorageKey({ userId: user.id, type: `branding/${asset}`, filename: file.name });
    const uploaded = await uploadPublicImage(new Uint8Array(await file.arrayBuffer()), { key, contentType: file.type });
    const [urlField, keyField] = assetFields[asset];
    await prisma.brandSettings.upsert({ where: { id: "default" }, create: { id: "default", [urlField]: uploaded.url, [keyField]: uploaded.key }, update: { [urlField]: uploaded.url, [keyField]: uploaded.key } });
    revalidatePath("/", "layout"); revalidatePath("/manifest.webmanifest"); revalidatePath("/admin/branding");
    return Response.json(uploaded);
  } catch (error) {
    console.error("branding upload failed", { error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "BRANDING_UPLOAD_FAILED" }, { status: 500 });
  }
}
