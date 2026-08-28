"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, referralCode: referralCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="block text-center text-[13px] text-white/60 hover:text-white">← Debt Sucker</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-center">Create your account</h1>
        <p className="mt-2 text-sm text-white/50 text-center">A premium finance dashboard in under a minute.</p>
        {referralCode && (
          <div className="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-center text-xs text-emerald-300">
            Referred with code <span className="font-mono font-semibold">{referralCode}</span> · you'll get 25 SC on signup
          </div>
        )}

        <a
          href="/api/auth/google/start?returnTo=/dashboard"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white text-black py-2.5 text-sm font-medium hover:bg-white/90 transition"
        >
          <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.4 6.4 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34.4 6.4 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.4 0 10.2-2.1 13.8-5.4l-6.4-5.4C29.4 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C41.1 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Continue with Google
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" />or<div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-white/50">Name</label>
            <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/50">Email</label>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/50">Password</label>
            <input className="input mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account? <Link href="/login" className="text-white hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
