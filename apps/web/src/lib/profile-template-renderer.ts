import type { ComponentType } from "react";
import type { TemplateFrameProps } from "@/components/profile-template-families/template-frame";
import type { TemplateFamily } from "./profile-templates";

type FamilyFrame = ComponentType<Omit<TemplateFrameProps,"family">>;
const loaders: Record<TemplateFamily, () => Promise<{ default: FamilyFrame }>> = {
  personal: () => import("@/components/profile-template-families/personal"),
  professional: () => import("@/components/profile-template-families/professional"),
  business: () => import("@/components/profile-template-families/business"),
  agency: () => import("@/components/profile-template-families/agency"),
  brand: () => import("@/components/profile-template-families/brand"),
  tech: () => import("@/components/profile-template-families/tech"),
  storefront: () => import("@/components/profile-template-families/storefront"),
};
export async function loadProfileTemplateFrame(family: TemplateFamily) { return (await loaders[family]()).default; }
