"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("demo@financewars.app");
    setPassword("demo1234");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="block text-center text-[13px] text-white/60 hover:text-white">← Finance Wars</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-center">Welcome back</h1>
        <p className="mt-2 text-sm text-white/50 text-center">Sign in to your dashboard.</p>

        <button onClick={fillDemo} className="mt-6 w-full text-left card p-4 hover:bg-white/[0.04] transition">
          <div className="text-xs text-white/50">Try demo</div>
          <div className="text-sm mt-1">demo@financewars.app / demo1234</div>
        </button>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-white/50">Email</label>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/50">Password</label>
            <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          No account? <Link href="/signup" className="text-white hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
