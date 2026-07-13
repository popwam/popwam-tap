import { prisma } from "@popwam/db";
import { isStorageEnabled } from "@popwam/storage";
import { requireUser } from "@/lib/session";
import { updateProfile } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { ImageField } from "@/components/image-field";

export const metadata = { title: "Profile" };

const fields = [
  ["title", "Title", "Founder & CEO"], ["email", "Public email", "you@example.com"], ["phone", "Phone", "010…"],
  ["whatsappBusiness", "WhatsApp Business", "010…"], ["whatsappPrivate", "WhatsApp Private", "010…"],
  ["website", "Website", "https://…"], ["vcfUrl", "VCF URL", "https://…/contact.vcf"], ["locationText", "Location", "City, Country"],
  ["facebook", "Facebook", "https://…"], ["linkedin", "LinkedIn", "https://…"], ["github", "GitHub", "https://…"], ["tiktok", "TikTok", "https://…"],
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null } });
  if (!profile) return <p>Profile could not be loaded.</p>;
  return <>
    <PageHeading eyebrow="Public identity" title="Profile" description="This is the profile shown when a tag is in PROFILE mode. Uploads are optional; direct image URLs always remain available."/>
    <form action={updateProfile} className="card max-w-5xl p-5 sm:p-7">
      <input type="hidden" name="profileId" value={profile.id}/>
      <div className="grid gap-5 sm:grid-cols-2">
        <label><span className="label">Display name</span><input className="input" name="displayName" required defaultValue={profile.displayName}/></label>
        <label><span className="label">Public slug</span><input className="input" name="slug" defaultValue={profile.slug || ""} placeholder="your-name"/></label>
        <div className="sm:col-span-2"><label className="label">Bio</label><textarea className="input min-h-28 resize-y" name="bio" defaultValue={profile.bio || ""}/></div>
        <ImageField type="avatar" initialUrl={profile.avatarUrl} initialKey={profile.avatarStorageKey} storageEnabled={isStorageEnabled()}/>
        <ImageField type="cover" initialUrl={profile.coverUrl} initialKey={profile.coverStorageKey} storageEnabled={isStorageEnabled()}/>
        {fields.map(([name, label, placeholder]) => <label key={name}><span className="label">{label}</span><input className="input" name={name} placeholder={placeholder} defaultValue={String(profile[name] || "")}/></label>)}
        <label className="flex items-center gap-3 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" name="isPublic" defaultChecked={profile.isPublic} className="size-4 accent-emerald-400"/> Public profile enabled</label>
      </div>
      <button className="btn-primary mt-7">Save profile</button>
    </form>
  </>;
}
