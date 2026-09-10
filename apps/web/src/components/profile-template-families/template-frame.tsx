import type { CSSProperties, ReactNode } from "react";
import type { TemplateFamily } from "@/lib/profile-templates";

export type TemplateFrameProps = {
  children: ReactNode;
  family: TemplateFamily;
  slug: string;
  theme: string;
  layoutClass: string;
  style: CSSProperties;
  organization: boolean;
};

export function TemplateFrame({ children, family, slug, theme, layoutClass, style, organization }: TemplateFrameProps) {
  return <main data-theme={theme} data-template={slug} data-template-family={family} style={style}
    className={`public-theme theme-${theme.toLowerCase()} ${layoutClass} ${organization ? "organization-profile" : "personal-profile"} min-h-screen py-0 sm:py-10`}>
    <div className="template-atmosphere" aria-hidden="true"><i/><i/><i/></div>
    <article className="profile-card relative mx-auto max-w-xl overflow-hidden sm:rounded-[var(--profile-radius)]">{children}</article>
    <p className="profile-powered profile-muted mt-6 text-center text-xs">Powered by <span className="font-bold">POP by POPWAM</span></p>
  </main>;
}
