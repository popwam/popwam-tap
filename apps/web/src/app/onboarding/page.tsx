import { prisma } from "@popwam/db";
import { isStorageEnabled } from "@popwam/storage";
import { saveOnboardingStep } from "@/app/onboarding-actions";
import { ImageField } from "@/components/image-field";
import { PageHeading } from "@/components/page-heading";
import { ProfileAvatar } from "@/components/profile-avatar";
import { requireUser } from "@/lib/session";
import { ONBOARDING_STEPS } from "@/lib/onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const { step: requested } = await searchParams;
  const [progress, card, platforms] = await Promise.all([
    prisma.onboardingProgress.findUnique({ where: { userId: user.id } }),
    prisma.virtualCard.findFirst({ where: { userId: user.id, isDefault: true }, include: { profile: true } }),
    prisma.linkPlatform.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
  ]);
  if (!card) return <div className="card p-6">Default virtual card is missing. Run the safe account repair.</div>;
  const saved = progress?.data && typeof progress.data === "object" && !Array.isArray(progress.data) ? progress.data as Record<string, unknown> : {};
  const step = Math.min(ONBOARDING_STEPS, Math.max(1, Number(requested || progress?.currentStep || 1)));
  const input = (name: string, label: string, options?: { required?: boolean; type?: string; dir?: "ltr" }) => <label><span className="label">{label}</span><input className="input" name={name} type={options?.type} dir={options?.dir} required={options?.required} defaultValue={String(saved[name] || "")}/></label>;
  return <main className="mx-auto min-h-screen max-w-3xl px-4 py-10"><PageHeading eyebrow={`Step ${step} of ${ONBOARDING_STEPS}`} title="Build your POPWAM identity" description="Your progress is saved after every short step, so you can leave and continue later."/>
    <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-400" style={{ width: `${(step / ONBOARDING_STEPS) * 100}%` }}/></div>
    <form action={saveOnboardingStep} className="card grid gap-5 p-6"><input type="hidden" name="step" value={step}/>
      {step === 1 && <><h2 className="text-xl font-black">What is your name? / ما اسمك؟</h2>{input("displayName", "Display name", { required: true })}{input("preferredName", "Preferred name")}</>}
      {step === 2 && <><h2 className="text-xl font-black">What do you do? / ماذا تعمل؟</h2>{input("jobTitle", "Job title")}{input("profession", "Profession or category")}</>}
      {step === 3 && <><h2 className="text-xl font-black">Where do you work? / أين تعمل؟</h2>{input("company", "Company or business name")}<label><span className="label">Employment type</span><select className="input" name="employmentType" defaultValue={String(saved.employmentType || "EMPLOYEE")}><option>EMPLOYEE</option><option>FREELANCER</option><option>FOUNDER</option><option>STUDENT</option><option>OTHER</option></select></label>{input("organization", "Optional organization")}</>}
      {step === 4 && <><h2 className="text-xl font-black">Do you have a website? / هل لديك موقع؟</h2>{input("website", "Website", { type: "url", dir: "ltr" })}<p className="text-sm text-slate-500">Leave it blank to skip.</p></>}
      {step === 5 && <><h2 className="text-xl font-black">Choose an avatar / اختر صورة</h2><div className="flex items-center gap-4"><ProfileAvatar name={card.name} email={user.email} imageUrl={card.profile.avatarUrl} size={72}/><p className="text-sm text-slate-500">Uploaded image takes priority, then generated/initials, then the POPWAM fallback.</p></div><ImageField type="avatar" initialUrl={card.profile.avatarUrl} initialKey={card.profile.avatarStorageKey} storageEnabled={isStorageEnabled()}/><div className="grid gap-3 sm:grid-cols-3">{[["UPLOADED","Uploaded"],["GENERATED","Generated"],["INITIALS","Initials"]].map(([value,label]) => <label className="rounded-xl border border-white/10 p-3" key={value}><input type="radio" name="avatarKind" value={value} defaultChecked={(card.avatarKind || "INITIALS") === value}/> {label}</label>)}</div>{input("avatarValue", "Generated avatar key (optional)")}</>}
      {step === 6 && <><h2 className="text-xl font-black">Add your first link / أضف أول رابط</h2><label><span className="label">Platform</span><select className="input" name="linkPlatformId" required={platforms.length > 0}><option value="">Choose platform</option>{platforms.map(platform => <option value={platform.id} key={platform.id}>{platform.nameEn} / {platform.nameAr}</option>)}</select></label>{input("url", "Username or URL", { dir: "ltr" })}{!platforms.length && <p className="text-amber-300">No active link platforms are configured. You can skip and an admin can add them later.</p>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="skip" value="true"/>Skip for now</label></>}
      <div className="flex justify-end"><button className="btn-primary">{step === ONBOARDING_STEPS ? "Finish / إنهاء" : "Save and continue / حفظ ومتابعة"}</button></div>
    </form>
  </main>;
}
