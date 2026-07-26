import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n";
import { PageHeading } from "@/components/page-heading";
import { ProfilePublishingClient } from "@/components/profile-publishing-client";
import { getOwnedDraft } from "@/lib/profile-publishing";

export default async function PublishProfilePage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const user = await requireUser();
  const [{ locale }, query] = await Promise.all([getI18n(), searchParams]);
  const requested = query.profile;
  const profile = requested
    ? await getOwnedDraft(user.id, requested)
    : await import("@popwam/db").then(({ prisma }) => prisma.profile.findFirst({ where: { userId: user.id, organizationId: null, lifecycle: { not: "ARCHIVED" } }, select: { id: true } }));
  if (!profile) return null;
  return <>
    <PageHeading
      eyebrow={locale === "ar" ? "الملف العام" : "Public profile"}
      title={locale === "ar" ? "المعاينة والنشر" : "Preview and publish"}
      description={locale === "ar" ? "راجع المسودة واضبط الإتاحة قبل نشر نسخة ثابتة للعامة." : "Review the draft and visibility before publishing an immutable public revision."}
    />
    <ProfilePublishingClient profileId={profile.id} locale={locale}/>
  </>;
}
