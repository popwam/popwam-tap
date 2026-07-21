import "dotenv/config";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { prisma } from "../src";

type ReviewRow = { userId: string; phone: string; reason: string };
const apply = process.argv.includes("--apply");

function parseLegacyPhone(raw: string) {
  const value = raw.trim().replace(/[^\d+]/g, "").replace(/^00/, "+");
  // International input is self-describing. Local input is inferred only for the
  // exact Egyptian mobile shape accepted by POP's former identity layer.
  const parsed = value.startsWith("+")
    ? parsePhoneNumberFromString(value)
    : /^01[0125]\d{8}$/.test(value)
      ? parsePhoneNumberFromString(value, "EG")
      : undefined;
  return parsed?.isValid() && parsed.country ? parsed : null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null }, phoneE164: null },
    select: { id: true, phone: true },
    orderBy: { id: "asc" },
  });
  const review: ReviewRow[] = [];
  let eligible = 0;
  let updated = 0;
  for (const user of users) {
    const phone = user.phone!;
    const parsed = parseLegacyPhone(phone);
    if (!parsed) {
      review.push({ userId: user.id, phone, reason: "AMBIGUOUS_OR_INVALID" });
      continue;
    }
    const duplicate = await prisma.user.findFirst({
      where: { phoneE164: parsed.number, id: { not: user.id } },
      select: { id: true },
    });
    if (duplicate) {
      review.push({ userId: user.id, phone, reason: `DUPLICATE_OF:${duplicate.id}` });
      continue;
    }
    eligible++;
    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneE164: parsed.number,
          phoneCountryIso2: parsed.country,
          phoneCallingCode: `+${parsed.countryCallingCode}`,
        },
      });
      updated++;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", scanned: users.length, eligible, updated, review }, null, 2));
}

main().finally(() => prisma.$disconnect());
