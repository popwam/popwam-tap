"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/dashboard";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, callbackUrl });
    setPending(false);
    if (result?.error) setError("Email or password is incorrect.");
    else { router.push(result?.url || callbackUrl); router.refresh(); }
  }

  return <div className="card w-full max-w-md p-6 sm:p-8">
    <div className="mb-7"><div className="text-sm font-black"><span className="text-brand-400">POPWAM</span> Tap</div><h1 className="mt-4 text-2xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-slate-400">Manage every smart card from one secure place.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <label><span className="label">Email</span><input className="input" name="email" type="email" autoComplete="email" required/></label>
      <label><span className="label">Password</span><input className="input" name="password" type="password" autoComplete="current-password" required/></label>
      {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
    {googleEnabled && <><div className="my-5 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/>OR<span className="h-px flex-1 bg-white/10"/></div><button onClick={() => signIn("google", { callbackUrl })} className="btn-secondary w-full">Continue with Google</button></>}
  </div>;
}
