"use server";

import {
  LegalDocumentStatus,
  LegalDocumentType,
  Prisma,
  prisma,
} from "@popwam/db";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  legalCountryScope,
  LEGAL_COUNTRY_SETTING_KEY,
  LEGAL_COUNTRY_TARGET_MODES,
  normalizeCountryIso2,
  sanitizeLegalCountryTargeting,
} from "@/lib/legal-country-policy";
import { requireAdmin } from "@/lib/session";

export async function saveLegalDocument(data: FormData) {
  const admin = await requireAdmin();
  const id = String(data.get("id") || "");
  const content = String(data.get("content") || "").trim();
  const documentType = String(
    data.get("documentType") || "",
  ) as LegalDocumentType;
  const status = String(data.get("status") || "DRAFT") as LegalDocumentStatus;
  const locale = String(data.get("locale") || "en")
    .trim()
    .toLowerCase();
  if (!Object.values(LegalDocumentType).includes(documentType))
    throw new Error("LEGAL_TYPE_INVALID");
  if (!Object.values(LegalDocumentStatus).includes(status))
    throw new Error("LEGAL_STATUS_INVALID");
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(locale))
    throw new Error("LEGAL_LOCALE_INVALID");
  const modeValue = String(data.get("countryTargetMode") || "GLOBAL");
  if (!LEGAL_COUNTRY_TARGET_MODES.includes(modeValue as never))
    throw new Error("LEGAL_COUNTRY_MODE_INVALID");
  const scope = legalCountryScope(
    modeValue as (typeof LEGAL_COUNTRY_TARGET_MODES)[number],
    data
      .getAll("countries")
      .map(normalizeCountryIso2)
      .filter((item): item is string => Boolean(item)),
  );
  if (scope.mode === "SELECTED") {
    const valid = await prisma.phoneCountryConfig.count({
      where: { iso2: { in: scope.countries } },
    });
    if (valid !== scope.countries.length)
      throw new Error("LEGAL_COUNTRY_INVALID");
  }
  const effectiveAt = new Date(String(data.get("effectiveAt") || ""));
  if (Number.isNaN(effectiveAt.getTime()))
    throw new Error("LEGAL_EFFECTIVE_DATE_INVALID");
  if (
    status === "PUBLISHED" &&
    (!content || !String(data.get("title") || "").trim())
  )
    throw new Error("LEGAL_PUBLISHED_CONTENT_REQUIRED");
  const record = {
    documentType,
    version: String(data.get("version") || "1")
      .trim()
      .slice(0, 40),
    locale,
    slug: String(data.get("slug") || "")
      .trim()
      .slice(0, 120),
    title: String(data.get("title") || "")
      .trim()
      .slice(0, 240),
    content,
    contentHash: createHash("sha256").update(content).digest("hex"),
    effectiveAt,
    required: data.get("required") === "on",
    requiresAcceptance: data.get("requiresAcceptance") === "on",
    status,
    isActive: status === "PUBLISHED",
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };
  await prisma.$transaction(async (tx) => {
    const document = id
      ? await tx.legalDocument.update({ where: { id }, data: record })
      : await tx.legalDocument.create({ data: record });
    const setting = await tx.systemSetting.findUnique({
      where: { key: LEGAL_COUNTRY_SETTING_KEY },
      select: { value: true },
    });
    const targeting = {
      ...sanitizeLegalCountryTargeting(setting?.value),
      [document.id]: { mode: scope.mode, countries: scope.countries },
    };
    await tx.systemSetting.upsert({
      where: { key: LEGAL_COUNTRY_SETTING_KEY },
      create: {
        key: LEGAL_COUNTRY_SETTING_KEY,
        value: targeting as unknown as Prisma.InputJsonValue,
      },
      update: { value: targeting as unknown as Prisma.InputJsonValue },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.legal.save",
        targetId: document.id,
        metadata: {
          type: documentType,
          locale,
          status,
          countryTargetMode: scope.mode,
          countries: scope.countries,
        },
      },
    });
  });
  revalidatePath("/admin/legal");
  revalidatePath("/terms");
  revalidatePath("/privacy");
}
