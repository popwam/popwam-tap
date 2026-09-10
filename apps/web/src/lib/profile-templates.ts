export type TemplateFamily = "personal" | "professional" | "business" | "agency" | "brand" | "tech" | "storefront";
export type TemplateProfileKind = "PERSONAL" | "BUSINESS";

export type ApprovedProfileTemplate = {
  source: number; slug: string; nameAr: string; nameEn: string; family: TemplateFamily;
  variant: string; supportedModules: readonly string[];
  profileKind: TemplateProfileKind; minimumPlan: "free" | "personal" | "pro" | "business";
  descriptionAr: string; descriptionEn: string; configuration: Record<string, string | number | boolean>;
};

const source = "https://github.com/popwam/profile1";
const commit = "85e9b34c6eaee209e717e2acbf6f7b41d0f73aa4";
const template = (sourceNumber: number, slug: string, nameAr: string, nameEn: string, family: TemplateFamily,
  profileKind: TemplateProfileKind, minimumPlan: ApprovedProfileTemplate["minimumPlan"],
  colors: { background: string; panel: string; text: string; muted: string; accent: string },
  layout: Partial<Record<"linkLayout" | "avatarPosition" | "headerAlign" | "coverStyle" | "contactLayout" | "desktopLayout", string>> = {}): ApprovedProfileTemplate => ({
  source: sourceNumber, slug, nameAr, nameEn, family, variant: slug,
  supportedModules: family==="storefront"?["IDENTITY","ABOUT","CONTACT","SOCIAL","LINKS","SERVICES","GALLERY"]:profileKind==="BUSINESS"?["IDENTITY","ABOUT","CONTACT","SOCIAL","LINKS","SERVICES","BRANCHES","GALLERY"]:["IDENTITY","ABOUT","CONTACT","SOCIAL","LINKS","GALLERY"],
  profileKind, minimumPlan,
  descriptionAr: `تصميم ${nameAr} المعتمد رقم ${sourceNumber}`,
  descriptionEn: `${nameEn}, approved design ${sourceNumber}`,
  configuration: { rendererVersion: 1, source, sourceCommit: commit, sourceFile: `${sourceNumber}.html`, templateVariant: slug, family,
    ...colors, accentText: colors.background, radius: family === "storefront" ? "28px" : "32px",
    itemRadius: family === "storefront" ? "18px" : "16px", buttonRadius: "99px", spacing: "14px",
    linkLayout: "list", avatarPosition: "center", headerAlign: "center", coverStyle: "inset", contactLayout: "grid",
    desktopLayout: family === "personal" ? "narrow" : "wide", ...layout },
});

export const APPROVED_PROFILE_TEMPLATES = [
  template(1,"personal-sunrise","إشراقة شخصية","Personal Sunrise","personal","PERSONAL","free",{background:"#fffaf1",panel:"#fffdf8",text:"#07172f",muted:"#667184",accent:"#f9a61a"},{avatarPosition:"start",headerAlign:"start",coverStyle:"minimal"}),
  template(2,"professional-noir","محترف داكن","Professional Noir","professional","PERSONAL","personal",{background:"#07121a",panel:"#0b1a24",text:"#f5f7fa",muted:"#b8c3cc",accent:"#35e0a1"},{avatarPosition:"start",headerAlign:"start",desktopLayout:"split"}),
  template(3,"professional-editorial","محترف تحريري","Professional Editorial","professional","PERSONAL","pro",{background:"#eef2f8",panel:"#ffffff",text:"#0a1a34",muted:"#52607a",accent:"#6d7cff"},{avatarPosition:"start",headerAlign:"start",desktopLayout:"split"}),
  template(4,"personal-rose-paper","ورق وردي","Rose Paper","personal","PERSONAL","free",{background:"#f7f1eb",panel:"#fffaf6",text:"#3d211a",muted:"#7d5c50",accent:"#b98978"},{coverStyle:"minimal"}),
  template(5,"personal-lavender","لافندر","Lavender","personal","PERSONAL","personal",{background:"#e9d7f4",panel:"#f8effd",text:"#2c155e",muted:"#6d568d",accent:"#8f56b3"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(6,"personal-botanical","طبيعي هادئ","Botanical","personal","PERSONAL","pro",{background:"#faf6ef",panel:"#fffaf3",text:"#2f3c33",muted:"#6c756d",accent:"#315e49"},{avatarPosition:"start",headerAlign:"start"}),
  template(7,"business-horizon","أفق الأعمال","Business Horizon","business","BUSINESS","business",{background:"#f3f5f8",panel:"#ffffff",text:"#162134",muted:"#6d7686",accent:"#1266d8"},{linkLayout:"grid",avatarPosition:"start",headerAlign:"start",desktopLayout:"split"}),
  template(8,"agency-idea-studio","ستوديو فكرة","Idea Studio","agency","BUSINESS","business",{background:"#f1eee5",panel:"#f7f3e9",text:"#10110f",muted:"#68655e",accent:"#ff8f24"},{linkLayout:"grid",avatarPosition:"start",headerAlign:"start",desktopLayout:"split"}),
  template(9,"brand-bloom","بلوم","Bloom Brand","brand","BUSINESS","business",{background:"#fffaf6",panel:"#fffdfa",text:"#3a2a29",muted:"#786b68",accent:"#c76573"},{linkLayout:"grid",coverStyle:"banner"}),
  template(10,"tech-link","لينك تك","Link Tech","tech","BUSINESS","business",{background:"#061225",panel:"#0b1d36",text:"#eef8ff",muted:"#9ab2ca",accent:"#28d8ff"},{linkLayout:"grid",avatarPosition:"start",headerAlign:"start",desktopLayout:"split"}),
  template(11,"store-first","متجر فيرست","First Store","storefront","BUSINESS","business",{background:"#fbfbf8",panel:"#ffffff",text:"#1d241f",muted:"#6d746f",accent:"#0c5a38"},{linkLayout:"grid",coverStyle:"banner"}),
  template(12,"store-lume","لوم ستور","Lume Store","storefront","BUSINESS","business",{background:"#f7f5f1",panel:"#ffffff",text:"#1e1e1b",muted:"#72716c",accent:"#1f2528"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(13,"store-glowup","جلو أب","GlowUp","storefront","BUSINESS","business",{background:"#fff3f5",panel:"#fffafb",text:"#2e1c22",muted:"#8b6872",accent:"#ff3c75"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(14,"store-nobletime","نوبل تايم","NobleTime","storefront","BUSINESS","business",{background:"#111311",panel:"#171a17",text:"#f2e8d5",muted:"#b7ad9c",accent:"#e4c38a"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(15,"store-stylehub","ستايل هب","StyleHub","storefront","BUSINESS","business",{background:"#f7f5f3",panel:"#ffffff",text:"#292521",muted:"#766f68",accent:"#25292d"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(16,"store-pawlove","باو لوف","PawLove","storefront","BUSINESS","business",{background:"#f7f7f1",panel:"#fffef9",text:"#26382f",muted:"#6d7a71",accent:"#237a59"},{linkLayout:"grid",coverStyle:"minimal"}),
  template(17,"store-techzone","تك زون","TechZone","storefront","BUSINESS","business",{background:"#f3f6fb",panel:"#ffffff",text:"#172235",muted:"#667389",accent:"#1766ff"},{linkLayout:"grid",coverStyle:"minimal"}),
] as const satisfies readonly ApprovedProfileTemplate[];

export const APPROVED_TEMPLATE_SLUGS = new Set<string>(APPROVED_PROFILE_TEMPLATES.map(item => item.slug));
export function approvedTemplateBySlug(slug?: string | null) { return APPROVED_PROFILE_TEMPLATES.find(item => item.slug === slug) || null; }
export function resolveApprovedTemplate(input: { slug?: string | null; profileKind?: string | null }) {
  const selected = approvedTemplateBySlug(input.slug);
  if (selected && (!input.profileKind || selected.profileKind === input.profileKind)) return selected;
  return input.profileKind === "BUSINESS" ? APPROVED_PROFILE_TEMPLATES.find(item => item.slug === "business-horizon")! : APPROVED_PROFILE_TEMPLATES[0];
}
export function templateEligible(input: { slug: string; profileKind: string | null | undefined; planSlug: string }) {
  const selected = approvedTemplateBySlug(input.slug); if (!selected || selected.profileKind !== input.profileKind) return false;
  const rank: Record<string, number> = { free: 0, personal: 1, pro: 2, business: 3 };
  return (rank[input.planSlug.toLowerCase()] ?? 0) >= rank[selected.minimumPlan];
}

const COLOR = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i;
const LENGTH = /^\d+(\.\d+)?(px|rem)$/;
export function templateCssVariables(configuration: unknown): Record<string, string> {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return {};
  const config = configuration as Record<string, unknown>; const result: Record<string, string> = {};
  const colors: Array<[string, string]> = [["background", "--profile-bg"], ["panel", "--profile-panel"], ["text", "--profile-text"], ["muted", "--profile-muted"], ["accent", "--profile-accent"], ["accentText", "--profile-accent-text"]];
  for (const [key, variable] of colors) if (typeof config[key] === "string" && COLOR.test(config[key])) result[variable] = config[key];
  const lengths: Array<[string, string]> = [["radius", "--profile-radius"], ["itemRadius", "--item-radius"], ["buttonRadius", "--profile-button-radius"], ["spacing", "--template-spacing"]];
  for (const [key, variable] of lengths) if (typeof config[key] === "string" && LENGTH.test(config[key])) result[variable] = config[key];
  return result;
}
export function templateLayoutClass(configuration: unknown) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return "template-list";
  const config = configuration as Record<string, unknown>; const pick=(key:string,allowed:string[],fallback:string)=>typeof config[key]==="string"&&allowed.includes(config[key] as string)?config[key] as string:fallback;
  const layout=pick("linkLayout",["grid","compact","list"],"list"), avatar=pick("avatarPosition",["start","center","end"],"start"), header=pick("headerAlign",["start","center","end"],"start"), cover=pick("coverStyle",["full","inset","banner","minimal"],"full"), contacts=pick("contactLayout",["grid","row","list"],"grid"), desktop=pick("desktopLayout",["narrow","wide","split"],"narrow");
  return `template-${layout} template-avatar-${avatar} template-header-${header} template-cover-${cover} template-contacts-${contacts} template-desktop-${desktop}`;
}
