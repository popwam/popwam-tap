import { PublicProfile } from "@/components/public-profile";
import { ADMIN_PREVIEW_STOREFRONT_POLICY, createAdminTemplatePreviewFixture } from "@/lib/template-preview-fixture";

export async function AdminTemplateRenderPreview({slug,locale}:{slug:string;locale:"ar"|"en"}){
  const fixture=createAdminTemplatePreviewFixture(slug);
  return <div data-preview-fixture="admin-only">
    <PublicProfile profile={fixture} adminPreviewContext={{locale,storefrontPolicy:ADMIN_PREVIEW_STOREFRONT_POLICY}}/>
  </div>;
}
