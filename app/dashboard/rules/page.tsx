"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Play } from "lucide-react";
import Modal from "../_components/Modal";

type Rule = {
  id: string; name: string; pattern: string; accountId: string | null;
  categoryOut: string; autoTag: string | null; priority: number; active: boolean;
};
type Acct = { id: string; name: string };
type Cat = { id: string; name: string; kind: string };

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Acct[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Rule | "new" | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [onlyUncat, setOnlyUncat] = useState(false);

  async function load() {
    setLoading(true);
    const [rs, ac, ct] = await Promise.all([
      fetch("/api/rules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setRules(rs || []);
    setAccounts(ac || []);
    setCats(ct || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    load();
  }

  async function move(rule: Rule, dir: -1 | 1) {
    // Swap priority with neighbor
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    const idx = sorted.findIndex((r) => r.id === rule.id);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= sorted.length) return;
    const neighbor = sorted[nIdx];
    await Promise.all([
      fetch(`/api/rules/${rule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: neighbor.priority }) }),
      fetch(`/api/rules/${neighbor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: rule.priority }) }),
    ]);
    load();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/rules/${rule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !rule.active }) });
    load();
  }

  async function applyAll() {
    setApplyResult(null);
    const res = await fetch("/api/rules/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onlyUncategorized: onlyUncat }) });
    const data = await res.json();
    setApplyResult(`Updated ${data.updated} of ${data.total} transactions.`);
    setConfirmApply(false);
  }

  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Rules</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Auto-categorize transactions by description.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setConfirmApply(true)} className="btn-secondary"><Play className="w-4 h-4" />Apply to history</button>
          <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />New rule</button>
        </div>
      </header>

      {applyResult && (
        <div className="card p-4 text-sm text-emerald-500">{applyResult}</div>
      )}

      {loading ? (
        <div className="text-black/40 dark:text-white/40 text-sm">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-black/60 dark:text-white/60">No rules yet.</div>
          <button onClick={() => setOpen("new")} className="btn-secondary mt-4">Create your first rule</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-black/40 dark:text-white/40">
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Pattern</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={r.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(r, -1)} disabled={idx === 0} className="p-1 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => move(r, 1)} disabled={idx === sorted.length - 1} className="p-1 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                      <span className="text-xs text-black/50 dark:text-white/50 ml-1">{r.priority}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">contains &ldquo;{r.pattern}&rdquo;</td>
                  <td className="px-4 py-3">{r.categoryOut}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{r.accountId ? accounts.find((a) => a.id === r.accountId)?.name || "—" : "Any"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(r)} className={`px-2 py-0.5 rounded-full text-xs ${r.active ? "bg-emerald-500/15 text-emerald-500" : "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50"}`}>
                      {r.active ? "Active" : "Off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setOpen(r)} className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(r.id)} className="p-2 text-black/40 dark:text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <RuleModal
          rule={open === "new" ? null : open}
          accounts={accounts}
          cats={cats}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }}
        />
      )}

      {confirmApply && (
        <Modal title="Apply rules to history" onClose={() => setConfirmApply(false)}>
          <p className="text-sm text-black/60 dark:text-white/60">This will recategorize existing transactions based on your active rules. Explicit categories already set will be overwritten unless you limit to uncategorized.</p>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyUncat} onChange={(e) => setOnlyUncat(e.target.checked)} />
            Only apply to uncategorized transactions
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setConfirmApply(false)} className="btn-ghost">Cancel</button>
            <button onClick={applyAll} className="btn-primary">Apply</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RuleModal({ rule, accounts, cats, onClose, onSaved }: {
  rule: Rule | null; accounts: Acct[]; cats: Cat[];
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [pattern, setPattern] = useState(rule?.pattern || "");
  const [categoryOut, setCategoryOut] = useState(rule?.categoryOut || cats[0]?.name || "Other");
  const [accountId, setAccountId] = useState(rule?.accountId || "");
  const [autoTag, setAutoTag] = useState(rule?.autoTag || "");
  const [active, setActive] = useState(rule?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = { name, pattern, categoryOut, active };
      body.accountId = accountId || null;
      body.autoTag = autoTag || null;
      const url = rule ? `/api/rules/${rule.id}` : "/api/rules";
      const res = await fetch(url, { method: rule ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={rule ? "Edit rule" : "New rule"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label htmlFor="rules-name" className="text-xs text-black/50 dark:text-white/50">Name</label>
          <input id="rules-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spotify subscriptions" />
        </div>
        <div>
          <label htmlFor="rules-pattern-case-insensitive-substring-on-description" className="text-xs text-black/50 dark:text-white/50">Pattern (case-insensitive substring on description)</label>
          <input id="rules-pattern-case-insensitive-substring-on-description" className="input" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="spotify" />
        </div>
        <div>
          <label htmlFor="rules-category" className="text-xs text-black/50 dark:text-white/50">Category</label>
          <select id="rules-category" className="input" value={categoryOut} onChange={(e) => setCategoryOut(e.target.value)}>
            {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rules-account-optional" className="text-xs text-black/50 dark:text-white/50">Account (optional)</label>
          <select id="rules-account-optional" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Any account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rules-auto-tag-optional" className="text-xs text-black/50 dark:text-white/50">Auto-tag (optional)</label>
          <input id="rules-auto-tag-optional" className="input" value={autoTag} onChange={(e) => setAutoTag(e.target.value)} placeholder="streaming" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        {err && <div className="text-xs text-rose-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}
