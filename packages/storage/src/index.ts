import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_FILE_TYPES = ["application/pdf", "text/vcard", "text/x-vcard", "text/plain", "image/jpeg", "image/png", "image/webp"];
let client: S3Client | undefined;

function env(name: string) {
  return process.env[name]?.trim();
}

export function isStorageEnabled() {
  return Boolean(
    env("R2_ENDPOINT") && env("R2_ACCESS_KEY_ID") && env("R2_SECRET_ACCESS_KEY") &&
    env("R2_BUCKET_NAME") && env("R2_PUBLIC_BASE_URL"),
  );
}

export function isDraftStorageEnabled() {
  return isStorageEnabled() && Boolean(env("R2_PRIVATE_BUCKET_NAME"));
}

export function getR2Client() {
  if (!isStorageEnabled()) throw new Error("Cloudflare R2 storage is not configured.");
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: env("R2_ENDPOINT"),
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID")!,
        secretAccessKey: env("R2_SECRET_ACCESS_KEY")!,
      },
    });
  }
  return client;
}

export type ImageMetadata = { filename: string; contentType: string; size: number };

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
  ".vcf": ["text/vcard", "text/x-vcard"],
  ".txt": ["text/plain"],
};

function extensionMatchesMime(filename: string, contentType: string) {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return Boolean(match && MIME_BY_EXTENSION[match[0]]?.includes(contentType.toLowerCase()));
}

export function validateImageUpload(metadata: ImageMetadata) {
  const maxMb = Number(env("MAX_IMAGE_UPLOAD_MB") || "5");
  const allowed = (env("ALLOWED_IMAGE_TYPES") || DEFAULT_TYPES.join(","))
    .split(",").map((type) => type.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(metadata.contentType.toLowerCase())) {
    return { valid: false as const, error: "Only JPEG, PNG, and WebP images are allowed." };
  }
  if (!extensionMatchesMime(metadata.filename, metadata.contentType)) {
    return { valid: false as const, error: "The image extension does not match its MIME type." };
  }
  if (!Number.isFinite(metadata.size) || metadata.size <= 0 || metadata.size > maxMb * 1024 * 1024) {
    return { valid: false as const, error: `Image must be smaller than ${maxMb} MB.` };
  }
  return { valid: true as const };
}

export function validateFileUpload(metadata: ImageMetadata) {
  const maxMb = Number(env("MAX_FILE_UPLOAD_MB") || "10");
  const allowed = (env("ALLOWED_FILE_TYPES") || DEFAULT_FILE_TYPES.join(",")).split(",").map(type => type.trim().toLowerCase()).filter(Boolean);
  const dangerous = /\.(exe|dll|com|bat|cmd|ps1|sh|js|mjs|html?|php|jar|msi|scr)$/i.test(metadata.filename);
  if (dangerous || !allowed.includes(metadata.contentType.toLowerCase()) || !extensionMatchesMime(metadata.filename, metadata.contentType)) return { valid: false as const, error: "This file type is not allowed or its extension does not match its MIME type." };
  if (!Number.isFinite(metadata.size) || metadata.size <= 0 || metadata.size > maxMb * 1024 * 1024) return { valid: false as const, error: `File must be smaller than ${maxMb} MB.` };
  return { valid: true as const };
}

function safePart(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "image";
}

export function createStorageKey(input: { userId: string; type: "avatar" | "cover" | string; filename: string }) {
  const folder = env("R2_PUBLIC_FOLDER") || "public";
  return `${safePart(folder)}/users/${safePart(input.userId)}/${safePart(input.type)}/${Date.now()}-${safePart(input.filename)}`;
}

export function createDraftStorageKey(input: { userId: string; profileId: string; type: string; filename: string }) {
  return `draft/users/${safePart(input.userId)}/profiles/${safePart(input.profileId)}/${safePart(input.type)}/${Date.now()}-${safePart(input.filename)}`;
}

export function detectImageContentType(body: Uint8Array) {
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47 && body[4] === 0x0d && body[5] === 0x0a && body[6] === 0x1a && body[7] === 0x0a) return "image/png";
  if (body.length >= 12 && String.fromCharCode(...body.slice(0, 4)) === "RIFF" && String.fromCharCode(...body.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function getPublicUrl(key: string) {
  const base = env("R2_PUBLIC_BASE_URL");
  if (!base) throw new Error("R2_PUBLIC_BASE_URL is not configured.");
  return `${base.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
}

export async function uploadPublicImage(
  body: Buffer | Uint8Array,
  options: { key: string; contentType: string; cacheControl?: string },
) {
  const bucket = env("R2_BUCKET_NAME");
  if (!bucket) throw new Error("R2 bucket is not configured.");
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: body,
    ContentType: options.contentType,
    CacheControl: options.cacheControl || "public, max-age=31536000, immutable",
  }));
  return { key: options.key, url: getPublicUrl(options.key) };
}

export const uploadPublicFile = uploadPublicImage;

export async function uploadDraftImage(body: Uint8Array, options: { key: string; contentType: string }) {
  const bucket = env("R2_PRIVATE_BUCKET_NAME");
  if (!bucket || !isDraftStorageEnabled()) throw new Error("Draft media storage is not configured.");
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: body,
    ContentType: options.contentType,
    CacheControl: "private, no-store",
  }));
  return { key: options.key };
}

export async function readDraftObject(key: string) {
  const bucket = env("R2_PRIVATE_BUCKET_NAME");
  if (!bucket || !isDraftStorageEnabled()) throw new Error("Draft media storage is not configured.");
  const result = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Draft media object is empty.");
  return {
    bytes: new Uint8Array(await result.Body.transformToByteArray()),
    contentType: result.ContentType || "application/octet-stream",
  };
}

export async function promoteDraftImage(key: string, publicKey: string, contentType: string) {
  const object = await readDraftObject(key);
  return uploadPublicImage(object.bytes, { key: publicKey, contentType, cacheControl: "public, max-age=31536000, immutable" });
}

export async function deleteDraftObject(key: string) {
  const bucket = env("R2_PRIVATE_BUCKET_NAME");
  if (!bucket || !isDraftStorageEnabled()) throw new Error("Draft media storage is not configured.");
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObject(key: string) {
  const bucket = env("R2_BUCKET_NAME");
  if (!bucket) throw new Error("R2 bucket is not configured.");
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
