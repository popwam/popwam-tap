import Link from "next/link";

export default function ForbiddenPage() {
  return <main className="flex min-h-screen items-center justify-center px-4"><section className="card max-w-lg p-8 text-center"><p className="text-sm font-bold text-red-300">403</p><h1 className="mt-3 text-2xl font-black">غير مصرح بالدخول · Access denied</h1><p className="mt-3 text-sm leading-7 text-slate-400">لا يملك هذا الحساب الصلاحية المطلوبة. This account does not have the required permission.</p><Link href="/dashboard" className="btn-secondary mt-6">لوحة المستخدم · User dashboard</Link></section></main>;
}
