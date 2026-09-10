import "server-only";

import { getMessaging } from "firebase-admin/messaging";
import { AdminNotificationAudience, Prisma, prisma } from "@popwam/db";
import { getFirebaseAdminApp } from "./firebase/admin";
import { decryptSecret } from "./token-vault";

type LocalizedCopy = { en: string; ar?: string; fr?: string };
export type AdminNotificationInput = {
  audienceType: AdminNotificationAudience;
  audienceValue: string;
  title: LocalizedCopy;
  body: LocalizedCopy;
  category: "GENERAL" | "MARKETING" | "PRODUCTS" | "SECURITY";
  deepLink?: string;
  imageUrl?: string;
  defaultLocale: "en" | "ar" | "fr";
};

const safeDeepLink = /^(home|my-profile|menu|profile\/[a-zA-Z0-9_-]{1,128})$/;
const trimCopy = (value: string | undefined, max: number) => value?.trim().slice(0, max) || "";

export function parseAdminNotificationInput(data: FormData): AdminNotificationInput {
  const audienceType = String(data.get("audienceType") || "TEST") as AdminNotificationAudience;
  if (!Object.values(AdminNotificationAudience).includes(audienceType)) throw new Error("NOTIFICATION_AUDIENCE_INVALID");
  const title = { en: trimCopy(String(data.get("titleEn") || ""), 120), ar: trimCopy(String(data.get("titleAr") || ""), 120), fr: trimCopy(String(data.get("titleFr") || ""), 120) };
  const body = { en: trimCopy(String(data.get("bodyEn") || ""), 500), ar: trimCopy(String(data.get("bodyAr") || ""), 500), fr: trimCopy(String(data.get("bodyFr") || ""), 500) };
  if (!title.en || !body.en) throw new Error("NOTIFICATION_COPY_REQUIRED");
  const category = String(data.get("category") || "GENERAL") as AdminNotificationInput["category"];
  if (!["GENERAL", "MARKETING", "PRODUCTS", "SECURITY"].includes(category)) throw new Error("NOTIFICATION_CATEGORY_INVALID");
  const deepLink = trimCopy(String(data.get("deepLink") || ""), 180);
  if (deepLink && !safeDeepLink.test(deepLink)) throw new Error("NOTIFICATION_DEEP_LINK_INVALID");
  const imageUrl = trimCopy(String(data.get("imageUrl") || ""), 2048);
  if (imageUrl && (!imageUrl.startsWith("https://") || !URL.canParse(imageUrl))) throw new Error("NOTIFICATION_IMAGE_INVALID");
  const defaultLocale = String(data.get("defaultLocale") || "en");
  if (!["en", "ar", "fr"].includes(defaultLocale)) throw new Error("NOTIFICATION_LOCALE_INVALID");
  const audienceValue = trimCopy(String(data.get("audienceValue") || ""), 4000);
  if (["USER", "SELECTED", "SEGMENT"].includes(audienceType) && !audienceValue) throw new Error("NOTIFICATION_RECIPIENTS_REQUIRED");
  return { audienceType, audienceValue, title, body, category, deepLink: deepLink || undefined, imageUrl: imageUrl || undefined, defaultLocale: defaultLocale as "en"|"ar"|"fr" };
}

function audienceWhere(input: AdminNotificationInput, creatorId: string): Prisma.UserWhereInput {
  if (input.audienceType === "TEST") return { id: creatorId };
  if (input.audienceType === "USER") return { id: input.audienceValue };
  if (input.audienceType === "SELECTED") {
    const ids = [...new Set(input.audienceValue.split(/[\s,]+/).map(String).filter(Boolean))].slice(0, 500);
    if (!ids.length) throw new Error("NOTIFICATION_RECIPIENTS_REQUIRED");
    return { id: { in: ids } };
  }
  switch (input.audienceValue) {
    case "LOCALE_AR": return { status: "ACTIVE", locale: { startsWith: "ar", mode: "insensitive" } };
    case "LOCALE_FR": return { status: "ACTIVE", locale: { startsWith: "fr", mode: "insensitive" } };
    case "LOCALE_EN": return { status: "ACTIVE", OR: [{ locale: null }, { locale: { startsWith: "en", mode: "insensitive" } }] };
    case "PUBLISHED_PROFILE": return { status: "ACTIVE", profiles: { some: { lifecycle: "PUBLISHED" } } };
    case "ALL_ACTIVE": return { status: "ACTIVE" };
    default: throw new Error("NOTIFICATION_SEGMENT_INVALID");
  }
}

function preferenceAllows(category: AdminNotificationInput["category"], value: { generalEnabled: boolean; marketingEnabled: boolean; productsEnabled: boolean; securityEnabled: boolean } | null) {
  if (!value) return category !== "MARKETING";
  if (category === "MARKETING") return value.marketingEnabled;
  if (category === "PRODUCTS") return value.productsEnabled;
  if (category === "SECURITY") return value.securityEnabled;
  return value.generalEnabled;
}

export async function createAdminNotificationCampaign(creatorId: string, input: AdminNotificationInput, sendNow: boolean) {
  const campaign = await prisma.adminNotificationCampaign.create({ data: {
    createdById: creatorId,
    status: sendNow ? "PROCESSING" : "DRAFT",
    audienceType: input.audienceType,
    audience: { value: input.audienceValue },
    title: input.title,
    body: input.body,
    category: input.category,
    deepLink: input.deepLink,
    imageUrl: input.imageUrl,
    defaultLocale: input.defaultLocale,
  } });
  if (!sendNow) return campaign;
  return dispatchAdminNotificationCampaign(campaign.id, creatorId, input);
}

export async function sendSavedAdminNotificationCampaign(campaignId: string, senderId: string) {
  const campaign = await prisma.adminNotificationCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "DRAFT") throw new Error("NOTIFICATION_CAMPAIGN_NOT_SENDABLE");
  const audience = campaign.audience as { value?: unknown };
  const title = campaign.title as { en?: unknown; ar?: unknown; fr?: unknown };
  const body = campaign.body as { en?: unknown; ar?: unknown; fr?: unknown };
  const input: AdminNotificationInput = {
    audienceType: campaign.audienceType,
    audienceValue: typeof audience.value === "string" ? audience.value : "",
    title: { en: typeof title.en === "string" ? title.en : "", ar: typeof title.ar === "string" ? title.ar : undefined, fr: typeof title.fr === "string" ? title.fr : undefined },
    body: { en: typeof body.en === "string" ? body.en : "", ar: typeof body.ar === "string" ? body.ar : undefined, fr: typeof body.fr === "string" ? body.fr : undefined },
    category: campaign.category as AdminNotificationInput["category"],
    deepLink: campaign.deepLink || undefined,
    imageUrl: campaign.imageUrl || undefined,
    defaultLocale: ["ar","fr"].includes(campaign.defaultLocale) ? campaign.defaultLocale as "ar"|"fr" : "en",
  };
  const claimed = await prisma.adminNotificationCampaign.updateMany({ where: { id: campaignId, status: "DRAFT" }, data: { status: "PROCESSING" } });
  if (claimed.count !== 1) throw new Error("NOTIFICATION_CAMPAIGN_NOT_SENDABLE");
  return dispatchAdminNotificationCampaign(campaignId, senderId, input);
}

async function dispatchAdminNotificationCampaign(campaignId: string, creatorId: string, input: AdminNotificationInput) {
  const recipients = await prisma.user.findMany({
    where: audienceWhere(input, creatorId),
    orderBy: { createdAt: "asc" },
    take: 500,
    select: {
      id: true,
      locale: true,
      notificationPreference: { select: { generalEnabled: true, marketingEnabled: true, productsEnabled: true, securityEnabled: true } },
      devicePushTokens: { where: { revokedAt: null }, orderBy: { lastSeenAt: "desc" }, take: 5, select: { id: true, tokenEncrypted: true } },
    },
  });
  const outcomes = new Map<string, { attempted: number; success: number; errors: string[]; suppressed: boolean }>();
  const tokens: Array<{ tokenId: string; token: string; userId: string; locale: "ar" | "en" | "fr" }> = [];
  const invalidTokenIds = new Set<string>();
  for (const recipient of recipients) {
    const allowed = preferenceAllows(input.category, recipient.notificationPreference);
    const outcome = { attempted: 0, success: 0, errors: [] as string[], suppressed: !allowed || recipient.devicePushTokens.length === 0 };
    outcomes.set(recipient.id, outcome);
    if (!allowed) continue;
    for (const row of recipient.devicePushTokens) {
      try {
        const token = decryptSecret(row.tokenEncrypted);
        const savedLocale=recipient.locale?.toLowerCase();const locale=savedLocale?.startsWith("ar")?"ar":savedLocale?.startsWith("fr")?"fr":savedLocale?.startsWith("en")?"en":input.defaultLocale;
        tokens.push({ tokenId: row.id, token, userId: recipient.id, locale });
        outcome.attempted++;
      } catch {
        outcome.errors.push("TOKEN_DECRYPT_FAILED");
      }
    }
  }
  for (const locale of ["en", "ar", "fr"] as const) {
    const localized = tokens.filter(item => item.locale === locale);
    for (let offset = 0; offset < localized.length; offset += 500) {
      const chunk = localized.slice(offset, offset + 500);
      try {
        const result = await getMessaging(getFirebaseAdminApp()).sendEachForMulticast({
          tokens: chunk.map(item => item.token),
          notification: {
            title: locale === "ar" && input.title.ar ? input.title.ar : locale === "fr" && input.title.fr ? input.title.fr : input.title.en,
            body: locale === "ar" && input.body.ar ? input.body.ar : locale === "fr" && input.body.fr ? input.body.fr : input.body.en,
            ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
          },
          data: { type: "ADMIN_MESSAGE", category: input.category, ...(input.deepLink ? { action: input.deepLink } : {}) },
          android: { priority: input.category === "SECURITY" ? "high" : "normal" },
        });
        result.responses.forEach((response, index) => {
          const item = chunk[index];
          const outcome = outcomes.get(item.userId)!;
          if (response.success) outcome.success++;
          else {
            const code = response.error?.code || "FCM_SEND_FAILED";
            outcome.errors.push(code);
            if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
              invalidTokenIds.add(item.tokenId);
            }
          }
        });
      } catch {
        chunk.forEach(item => outcomes.get(item.userId)!.errors.push("FCM_PROVIDER_UNAVAILABLE"));
      }
    }
  }
  if (invalidTokenIds.size) await prisma.devicePushToken.updateMany({ where: { id: { in: [...invalidTokenIds] } }, data: { revokedAt: new Date() } });
  const deliveries = recipients.map(recipient => {
    const outcome = outcomes.get(recipient.id)!;
    const status = outcome.suppressed ? "SUPPRESSED" : outcome.success > 0 ? "SENT" : "FAILED";
    return {
      campaignId,
      recipientUserId: recipient.id,
      status: status as "SUPPRESSED" | "SENT" | "FAILED",
      attemptedTokens: outcome.attempted,
      successfulTokens: outcome.success,
      failureCode: outcome.errors[0]?.slice(0, 120),
    };
  });
  if (deliveries.length) await prisma.adminNotificationDelivery.createMany({ data: deliveries });
  const successCount = deliveries.filter(item => item.status === "SENT").length;
  const suppressedCount = deliveries.filter(item => item.status === "SUPPRESSED").length;
  const failureCount = deliveries.filter(item => item.status === "FAILED").length;
  const status = successCount === recipients.length && recipients.length > 0 ? "SENT" : successCount > 0 ? "PARTIAL" : failureCount > 0 ? "FAILED" : "SUPPRESSED";
  return prisma.adminNotificationCampaign.update({ where: { id: campaignId }, data: {
    status,
    recipientCount: recipients.length,
    successCount,
    suppressedCount,
    failureCount,
    sentAt: new Date(),
  } });
}
