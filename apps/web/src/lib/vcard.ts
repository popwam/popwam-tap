export function escapeVCard(value: string | null | undefined) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function safeVCardFilename(value: string) {
  const safe = value.normalize("NFKD").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${safe || "contact"}.vcf`;
}

type Contact = {
  kind: "individual" | "org";
  firstName?: string | null; lastName?: string | null; displayName: string;
  organization?: string | null; title?: string | null; phones: Array<string | null | undefined>;
  whatsapp?: string | null; email?: string | null; website?: string | null;
  address?: string | null; notes?: string | null; photoUrl?: string | null;
};

export function createVCard(contact: Contact) {
  const lines = ["BEGIN:VCARD", "VERSION:4.0", "KIND:" + contact.kind];
  lines.push(`FN:${escapeVCard(contact.displayName)}`);
  if (contact.kind === "individual") lines.push(`N:${escapeVCard(contact.lastName)};${escapeVCard(contact.firstName)};;;`);
  if (contact.organization) lines.push(`ORG:${escapeVCard(contact.organization)}`);
  if (contact.title) lines.push(`TITLE:${escapeVCard(contact.title)}`);
  for (const phone of [...new Set(contact.phones.filter(Boolean))]) lines.push(`TEL;TYPE=voice:${escapeVCard(phone)}`);
  if (contact.whatsapp) lines.push(`IMPP;TYPE=personal:${escapeVCard(`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`)}`);
  if (contact.email) lines.push(`EMAIL:${escapeVCard(contact.email)}`);
  if (contact.website) lines.push(`URL:${escapeVCard(contact.website)}`);
  if (contact.address) lines.push(`ADR:;;${escapeVCard(contact.address)};;;;`);
  if (contact.notes) lines.push(`NOTE:${escapeVCard(contact.notes)}`);
  if (contact.photoUrl && /^https:\/\//i.test(contact.photoUrl)) lines.push(`PHOTO;VALUE=uri:${escapeVCard(contact.photoUrl)}`);
  lines.push(`REV:${new Date().toISOString()}`, "END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}
