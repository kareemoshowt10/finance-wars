"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR", "BRL"];

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loaded, setLoaded] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setName(me.name || "");
      setEmail(me.email || "");
      setCurrency(me.currency || "USD");
      setLoaded(true);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setProfileMsg({ type: "ok", text: "Profile saved." });
    } catch (err) {
      setProfileMsg({ type: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally { setProfileSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 6) { setPwMsg({ type: "err", text: "New password must be 6+ characters" }); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change password");
      setPwMsg({ type: "ok", text: "Password updated." });
      setCurrentPassword(""); setNewPassword("");
    } catch (err) {
      setPwMsg({ type: "err", text: err instanceof Error ? err.message : "Update failed" });
    } finally { setPwSaving(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Settings</h1>
        <p className="text-white/50 mt-1 text-sm">Profile, preferences, security.</p>
      </header>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/50">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-white/50">Email</label>
            <input className="input mt-1 opacity-60" value={email} disabled />
          </div>
          <div>
            <label className="text-xs text-white/50">Currency</label>
            <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {profileMsg && <div className={`text-sm ${profileMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{profileMsg.text}</div>}
          <div className="flex justify-end">
            <button disabled={profileSaving} className="btn-primary">{profileSaving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Change password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-white/50">Current password</label>
            <input className="input mt-1" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-white/50">New password</label>
            <input className="input mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          {pwMsg && <div className={`text-sm ${pwMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{pwMsg.text}</div>}
          <div className="flex justify-end">
            <button disabled={pwSaving} className="btn-primary">{pwSaving ? "Updating…" : "Update password"}</button>
          </div>
        </form>
      </section>

      <section className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sign out</h2>
          <p className="text-xs text-white/50 mt-1">End your session on this device.</p>
        </div>
        <button onClick={logout} className="btn-danger inline-flex items-center gap-2"><LogOut className="w-4 h-4" />Log out</button>
      </section>
    </div>
  );
}
