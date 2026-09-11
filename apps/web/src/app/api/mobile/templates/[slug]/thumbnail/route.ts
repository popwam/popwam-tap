import { approvedTemplateBySlug } from "@/lib/profile-templates";

/** Public, schematic catalogue artwork from safe registry tokens. No profile data or source HTML. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const template = approvedTemplateBySlug((await params).slug);
  if (!template) return new Response("Not found", { status: 404 });
  const { background, panel, accent, text } = template.configuration;
  const grid = template.profileKind === "BUSINESS";
  const cards = Array.from({ length: grid ? 4 : 3 }, (_, index) => grid
    ? `<rect x="${24 + index % 2 * 130}" y="${144 + Math.floor(index / 2) * 74}" width="116" height="62" rx="10" fill="${panel}" stroke="${accent}"/><rect x="${34 + index % 2 * 130}" y="${154 + Math.floor(index / 2) * 74}" width="44" height="30" rx="6" fill="${accent}" opacity=".4"/>`
    : `<rect x="26" y="${144 + index * 46}" width="228" height="32" rx="16" fill="${accent}" opacity="${.3 + index * .2}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="310" viewBox="0 0 280 310"><rect width="280" height="310" rx="22" fill="${background}"/><circle cx="140" cy="58" r="28" fill="${accent}"/><rect x="86" y="99" width="108" height="10" rx="5" fill="${text}"/><rect x="106" y="119" width="68" height="5" rx="2" fill="${text}" opacity=".4"/>${cards}</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400", "content-security-policy": "default-src 'none'; sandbox", "x-content-type-options": "nosniff" } });
}
