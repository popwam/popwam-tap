import { createStorageKey, isStorageEnabled, uploadPublicImage, validateImageUpload } from "@popwam/storage";
import { csrfRejected, getApiUser, isSameOriginMutation, unauthorized } from "@/lib/api-auth";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const user = await getApiUser();
  if (!user) return unauthorized();
  if (!isStorageEnabled()) return Response.json({ error: "Storage is not configured." }, { status: 503 });
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return Response.json({ error: "Image file is required." }, { status: 400 });
    const result = validateImageUpload({ filename: file.name, contentType: file.type, size: file.size });
    if (!result.valid) return Response.json({ error: result.error }, { status: 400 });
    const key = createStorageKey({ userId: user.id, type: "cover", filename: file.name });
    return Response.json(await uploadPublicImage(new Uint8Array(await file.arrayBuffer()), { key, contentType: file.type }));
  } catch { return Response.json({ error: "Upload failed." }, { status: 500 }); }
}
