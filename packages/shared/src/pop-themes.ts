export const POP_PLAN_THEMES = {
  default: { cardBackground:"#050505",primary:"#D4AF37",secondary:"#FFFFFF",textPrimary:"#FFFFFF",textSecondary:"#B8B8B8",border:"#6E5420",iconPrimary:"#D4AF37",iconSecondary:"#FFFFFF",accent:"#F5D76E" },
  personal: { cardBackground:"#FFFFFF",primary:"#2563EB",secondary:"#111111",textPrimary:"#111111",textSecondary:"#6B7280",border:"#D1D5DB",iconPrimary:"#2563EB",iconSecondary:"#111111",accent:"#38BDF8" },
  plus: { cardBackground:"#071A2C",primary:"#22D3EE",secondary:"#FFFFFF",textPrimary:"#FFFFFF",textSecondary:"#B8D9E8",border:"#1E3A5F",iconPrimary:"#22D3EE",iconSecondary:"#FFFFFF",accent:"#38BDF8" },
  pro: { cardBackground:"#050505",primary:"#D4AF37",secondary:"#FFFFFF",textPrimary:"#FFFFFF",textSecondary:"#C9C9C9",border:"#6E5420",iconPrimary:"#D4AF37",iconSecondary:"#FFFFFF",accent:"#F5D76E" },
  business: { cardBackground:"#0F172A",primary:"#C0C0C0",secondary:"#FFFFFF",textPrimary:"#FFFFFF",textSecondary:"#B8C1CC",border:"#50637A",iconPrimary:"#C0C0C0",iconSecondary:"#FFFFFF",accent:"#9CA3AF" },
  proBusiness: { cardBackground:"#050505",primary:"#F2C94C",secondary:"#FFF6D5",textPrimary:"#FFFFFF",textSecondary:"#D8D0B7",border:"#D4AF37",iconPrimary:"#F2C94C",iconSecondary:"#FFF6D5",accent:"#FFD86B" },
} as const;
export type PopThemeId = keyof typeof POP_PLAN_THEMES;
export function isPopThemeId(value:string):value is PopThemeId{return value in POP_PLAN_THEMES;}
export function popTheme(value:string|undefined){return isPopThemeId(value||"")?POP_PLAN_THEMES[value as PopThemeId]:POP_PLAN_THEMES.default;}
