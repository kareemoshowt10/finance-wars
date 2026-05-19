"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Download, Trash2, Key, Copy, Swords } from "lucide-react";
import ThemeToggle from "../_components/ThemeToggle";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR", "BRL"];

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loaded, setLoaded] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePw, setProfilePw] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setName(me.name || ""); setEmail(me.email || ""); setOrigEmail(me.email || "");
      setCurrency(me.currency || "USD");
      setLoaded(true);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const body: Record<string, unknown> = { name, currency };
      if (email !== origEmail) {
        if (!profilePw) throw new Error("Enter current password to change email");
        body.email = email; body.currentPassword = profilePw;
      }
      const res = await fetch("/api/user", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setProfileMsg({ type: "ok", text: "Profile saved." });
      setOrigEmail(email); setProfilePw("");
    } catch (err) {
      setProfileMsg({ type: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally { setProfileSaving(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 6) { setPwMsg({ type: "err", text: "6+ characters" }); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
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

  async function deleteAccount() {
    setDelErr(null);
    if (delConfirm !== "DELETE") { setDelErr("Type DELETE to confirm"); return; }
    const res = await fetch("/api/user/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: delPw }),
    });
    const d = await res.json();
    if (!res.ok) { setDelErr(d.error || "Failed"); return; }
    router.push("/");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }

  if (!loaded) return <div className="text-sm opacity-50">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">Settings</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Profile, preferences, security.</p>
      </header>

      <section className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Switch between light and dark.</p>
        </div>
        <ThemeToggle />
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Email</label>
            <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {email !== origEmail && (
            <div>
              <label className="text-xs text-black/50 dark:text-white/50">Current password (required to change email)</label>
              <input className="input mt-1" type="password" value={profilePw} onChange={(e) => setProfilePw(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs text-black/50 dark:text-white/50">Currency</label>
            <select className="input mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {profileMsg && <div className={`text-sm ${profileMsg.type === "ok" ? "text-emerald-500" : "text-rose-500"}`}>{profileMsg.text}</div>}
          <div className="flex justify-end">
            <button disabled={profileSaving} className="btn-primary">{profileSaving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">Change password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-3">
          <input className="input" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <input className="input" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          {pwMsg && <div className={`text-sm ${pwMsg.type === "ok" ? "text-emerald-500" : "text-rose-500"}`}>{pwMsg.text}</div>}
          <div className="flex justify-end">
            <button disabled={pwSaving} className="btn-primary">{pwSaving ? "Updating…" : "Update password"}</button>
          </div>
        </form>
      </section>

      <section className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Export data</h2>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">Download all your data as JSON.</p>
        </div>
        <a href="/api/user/export" className="btn-secondary"><Download className="w-4 h-4" />Export</a>
      </section>

      <section className="card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sign out</h2>
          <p className="text-xs text-black/50 dark:text-white/50 mt-1">End your session on this device.</p>
        </div>
        <button onClick={logout} className="btn-danger inline-flex items-center gap-2"><LogOut className="w-4 h-4" />Log out</button>
      </section>

      <DuelPreferencesSection />

      <ApiTokensSection />

      <section className="card p-6 border-rose-500/30">
        <h2 className="text-sm font-semibold text-rose-500">Danger zone</h2>
        <p className="text-xs text-black/50 dark:text-white/50 mt-1">Permanently delete your account and all data.</p>
        <button onClick={() => setDelOpen(true)} className="btn-danger mt-3 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete account</button>
      </section>

      {delOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDelOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card p-6 max-w-md w-full bg-white dark:bg-[#0a0a0a]">
            <h3 className="text-lg font-semibold text-rose-500">Delete account</h3>
            <p className="text-sm mt-2 opacity-70">This permanently deletes all your accounts, transactions, budgets, goals, and history. This cannot be undone.</p>
            <input className="input mt-4" type="password" placeholder="Your password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
            <input className="input mt-2" placeholder='Type "DELETE" to confirm' value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} />
            {delErr && <div className="text-sm text-rose-500 mt-2">{delErr}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDelOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={deleteAccount} className="btn-danger">Permanently delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ApiTokenRow = { id: string; name: string; lastUsedAt?: string | null; createdAt: string; revokedAt?: string | null };

function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiTokenRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const data = await fetch("/api/tokens").then((r) => r.json());
    setTokens(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewToken(data.token);
      setName("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this token? Any clients using it will stop working.")) return;
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">API tokens</h2>
      </div>
      <p className="text-xs text-black/50 dark:text-white/50 mt-1">
        Use a token with <code>Authorization: Bearer fw_pat_…</code> to call any /api endpoint.
        See <a href="/docs" className="underline">developer docs</a> for the full reference.
      </p>

      {newToken && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Copy now — this token won&apos;t be shown again.</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 text-xs break-all bg-black/5 dark:bg-white/5 px-2 py-1 rounded">{newToken}</code>
            <button onClick={() => { navigator.clipboard.writeText(newToken); }} className="p-2 hover:text-black dark:hover:text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setNewToken(null)} className="mt-2 text-xs underline">Dismiss</button>
        </div>
      )}

      <form onSubmit={create} className="mt-4 flex gap-2">
        <input className="input flex-1" placeholder="Token name (e.g. CLI)" value={name} onChange={(e) => setName(e.target.value)} required />
        <button disabled={busy} className="btn-primary">{busy ? "Creating…" : "Create"}</button>
      </form>
      {err && <div className="text-sm text-rose-500 mt-2">{err}</div>}

      <ul className="mt-4 divide-y divide-black/5 dark:divide-white/5">
        {tokens.length === 0 ? (
          <li className="text-xs text-black/40 dark:text-white/40 py-3">No tokens yet.</li>
        ) : tokens.map((t) => (
          <li key={t.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm">{t.name} {t.revokedAt && <span className="text-rose-500 text-xs">(revoked)</span>}</div>
              <div className="text-xs text-black/40 dark:text-white/40">
                Created {new Date(t.createdAt).toLocaleDateString()} · {t.lastUsedAt ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "Never used"}
              </div>
            </div>
            {!t.revokedAt && (
              <button onClick={() => revoke(t.id)} className="text-xs text-rose-500 hover:underline">Revoke</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DuelPreferencesSection() {
  const [notify, setNotify] = useState(true);
  const [stakeAccountId, setStakeAccountId] = useState<string>("");
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [me, accts] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
      ]);
      setNotify(me.notifyOnOpponentContribution ?? true);
      setStakeAccountId(me.defaultStakeAccountId || "");
      setAccounts(Array.isArray(accts) ? accts : []);
      setLoaded(true);
    })();
  }, []);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyOnOpponentContribution: notify,
          defaultStakeAccountId: stakeAccountId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  }

  if (!loaded) return null;
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">Duel preferences</h2>
      </div>
      <div className="mt-4 space-y-4">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-sm">Notify on opponent contributions</div>
            <div className="text-xs text-black/50 dark:text-white/50">Get a ping when your partner logs progress.</div>
          </div>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
        </label>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Default stake account</label>
          <select className="input mt-1" value={stakeAccountId} onChange={(e) => setStakeAccountId(e.target.value)}>
            <option value="">— none —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
          </select>
        </div>
        {msg && <div className="text-sm text-black/60 dark:text-white/60">{msg}</div>}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save preferences"}</button>
        </div>
      </div>
    </section>
  );
}
