"use client";

import { useActionState } from "react";
import { createAdminUser, type CreateUserState } from "@/app/actions";

const messages: Record<string, { ar: string; en: string }> = {
  EMAIL_IN_USE: { ar: "هذا البريد الإلكتروني مستخدم بالفعل.", en: "This email address is already in use." },
  INVALID_EMAIL: { ar: "يرجى إدخال بريد إلكتروني صالح.", en: "Enter a valid email address." },
  PASSWORD_TOO_SHORT: { ar: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.", en: "Password must be at least 8 characters." },
  CREATE_USER_FAILED: { ar: "تعذر إنشاء المستخدم. حاول مرة أخرى.", en: "The user could not be created. Please try again." },
};
const initialState: CreateUserState = { ok: false };

export function AdminCreateUserForm({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const [state, action, pending] = useActionState(createAdminUser, initialState);
  const copy = locale === "ar" ? { name: "الاسم", email: "البريد الإلكتروني", password: "كلمة المرور", role: "صلاحية النظام", create: "إنشاء الحساب", success: "تم إنشاء الحساب بنجاح." } : { name: "Name", email: "Email", password: "Password", role: "System role", create: "Create account", success: "Account created successfully." };
  return <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label><span className="label">{copy.name}</span><input className="input" name="name"/></label>
    <label><span className="label">{copy.email}</span><input className="input" type="email" name="email" required/></label>
    <label><span className="label">{copy.password}</span><input className="input" type="password" name="password" minLength={8} required/></label>
    <label><span className="label">{copy.role}</span><select className="input" name="role"><option>USER</option><option>ADMIN</option></select></label>
    {state.code && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{messages[state.code]?.[locale] || messages.CREATE_USER_FAILED[locale]}</p>}
    {state.ok && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200 sm:col-span-2">{copy.success}</p>}
    <button className="btn-primary sm:col-span-2 sm:justify-self-start" disabled={pending}>{copy.create}</button>
  </form>;
}
