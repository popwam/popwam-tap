import { Prisma, prisma } from "@popwam/db";

export const FIGMA_TEMPLATES = [
  {
    slug:"pop-landscape",nameAr:"POP أفقي",nameEn:"POP Landscape",category:"POP",minimumPlan:"free",previewImageUrl:"/brand/pop/card-landscape-front.png",sortOrder:1,
    configuration:{templateVariant:"pop-landscape",frontAsset:"/brand/pop/card-landscape-front.svg",backAsset:"/brand/pop/card-landscape-back.svg",background:"#050505",panel:"#050505",text:"#FFFFFF",muted:"#B8B8B8",accent:"#D4AF37",accentText:"#050505",radius:"32px",itemRadius:"16px",buttonRadius:"99px",spacing:"14px",linkLayout:"list",avatarPosition:"start",headerAlign:"start",coverStyle:"nfc-arcs",contactLayout:"row",desktopLayout:"wide"},
  },
  {
    slug:"pop-portrait",nameAr:"POP رأسي",nameEn:"POP Portrait",category:"POP",minimumPlan:"pro",previewImageUrl:"/brand/pop/card-portrait-front.png",sortOrder:2,
    configuration:{templateVariant:"pop-portrait",frontAsset:"/brand/pop/card-portrait-front.svg",backAsset:"/brand/pop/card-portrait-back.svg",background:"#050505",panel:"#050505",text:"#FFFFFF",muted:"#B8B8B8",accent:"#D4AF37",accentText:"#050505",radius:"32px",itemRadius:"18px",buttonRadius:"99px",spacing:"16px",linkLayout:"compact",avatarPosition:"start",headerAlign:"start",coverStyle:"nfc-arcs",contactLayout:"grid",desktopLayout:"narrow"},
  },
  {
    slug: "personal-free-links",
    nameAr: "روابط شخصية",
    nameEn: "Personal Links",
    category: "Personal",
    minimumPlan: "free",
    previewImageUrl: "/templates/personal-free-links.png",
    sortOrder: 10,
    configuration: {
      templateVariant: "personal-free-links",
      background: "#000000", panel: "#000000", text: "#ffffff", muted: "#ffffff",
      accent: "#3a8a8d", accentText: "#ffffff", radius: "0px", itemRadius: "12px",
      buttonRadius: "12px", spacing: "16px", linkLayout: "list", avatarPosition: "center",
      headerAlign: "center", coverStyle: "minimal", contactLayout: "list", desktopLayout: "narrow",
    },
  },
  {
    slug: "personal-pro-hero",
    nameAr: "واجهة احترافية",
    nameEn: "Professional Hero",
    category: "Professional",
    minimumPlan: "free",
    previewImageUrl: "/templates/personal-pro-hero.png",
    sortOrder: 20,
    configuration: {
      templateVariant: "personal-pro-hero",
      background: "#ffffff", panel: "#ffffff", text: "#121020", muted: "#5c6779",
      accent: "#eff2f6", accentText: "#121020", radius: "28px", itemRadius: "28px",
      buttonRadius: "28px", spacing: "14px", linkLayout: "list", avatarPosition: "center",
      headerAlign: "center", coverStyle: "full", contactLayout: "list", desktopLayout: "narrow",
    },
  },
  {
    slug: "personal-plus-tabs",
    nameAr: "تبويبات بلس",
    nameEn: "Personal Plus Tabs",
    category: "Creator",
    minimumPlan: "pro",
    previewImageUrl: "/templates/personal-plus-tabs.png",
    sortOrder: 30,
    configuration: {
      templateVariant: "personal-plus-tabs",
      background: "#1f1f20", panel: "#24232b", text: "#efedf7", muted: "#b0adbf",
      accent: "#323947", accentText: "#f4f2fa", radius: "0px", itemRadius: "7px",
      buttonRadius: "7px", spacing: "10px", linkLayout: "compact", avatarPosition: "center",
      headerAlign: "center", coverStyle: "minimal", contactLayout: "row", desktopLayout: "narrow",
    },
  },
  {
    slug: "business-free-portfolio",
    nameAr: "معرض الأعمال",
    nameEn: "Business Portfolio",
    category: "Business",
    minimumPlan: "business",
    previewImageUrl: "/templates/business-free-portfolio.png",
    sortOrder: 40,
    configuration: {
      templateVariant: "business-free-portfolio",
      background: "#ffffff", panel: "#ffffff", text: "#111111", muted: "#4b5563",
      accent: "#874fff", accentText: "#ffffff", radius: "0px", itemRadius: "11px",
      buttonRadius: "11px", spacing: "14px", linkLayout: "grid", avatarPosition: "center",
      headerAlign: "center", coverStyle: "minimal", contactLayout: "grid", desktopLayout: "wide",
    },
  },
  {
    slug: "business-pro-grid",
    nameAr: "شبكة الأعمال",
    nameEn: "Business Pro Grid",
    category: "Business",
    minimumPlan: "business",
    previewImageUrl: "/templates/business-pro-grid.png",
    sortOrder: 50,
    configuration: {
      templateVariant: "business-pro-grid",
      background: "#1e1e1e", panel: "#0e1b35", text: "#ffffff", muted: "#c9d1d9",
      accent: "#ffb829", accentText: "#121020", radius: "32px", itemRadius: "12px",
      buttonRadius: "99px", spacing: "12px", linkLayout: "grid", avatarPosition: "center",
      headerAlign: "center", coverStyle: "banner", contactLayout: "row", desktopLayout: "wide",
    },
  },
  {
    slug: "business-pro-social",
    nameAr: "بطاقات اجتماعية",
    nameEn: "Business Social Cards",
    category: "Business",
    minimumPlan: "business",
    previewImageUrl: "/templates/business-pro-social.png",
    sortOrder: 60,
    configuration: {
      templateVariant: "business-pro-social",
      background: "#1e1e1e", panel: "#101a31", text: "#ffffff", muted: "#c9d1d9",
      accent: "#825bdd", accentText: "#ffffff", radius: "32px", itemRadius: "14px",
      buttonRadius: "99px", spacing: "12px", linkLayout: "grid", avatarPosition: "center",
      headerAlign: "center", coverStyle: "banner", contactLayout: "grid", desktopLayout: "wide",
    },
  },
] as const;

export async function ensureFigmaTemplates() {
  await Promise.all(FIGMA_TEMPLATES.map(template => prisma.profileTemplate.upsert({
    where: { slug: template.slug },
    update: {
      nameAr: template.nameAr, nameEn: template.nameEn, category: template.category,
      minimumPlan: template.minimumPlan, previewImageUrl: template.previewImageUrl,
      configuration: template.configuration as unknown as Prisma.InputJsonValue,
      isActive: true, sortOrder: template.sortOrder,
    },
    create: {
      ...template,
      configuration: template.configuration as unknown as Prisma.InputJsonValue,
      isActive: true,
    },
  })));
}
