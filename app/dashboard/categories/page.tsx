"use client";
import { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ICON_CHOICES, COLOR_CHOICES } from "@/lib/defaults";
import Modal from "../_components/Modal";

type Cat = { id: string; name: string; color: string; icon: string; kind: "INCOME" | "EXPENSE" };

function Icon({ name, className }: { name: string; className?: string }) {
  const I = (Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] || Lucide.Tag;
  return <I className={className} />;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [open, setOpen] = useState<Cat | null | "new">(null);

  async function load() {
    const c = await fetch("/api/categories").then((r) => r.json());
    setItems(c);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">Categories</h1>
          <p className="text-black/50 dark:text-white/50 mt-1 text-sm">Personalize how you classify your money.</p>
        </div>
        <button onClick={() => setOpen("new")} className="btn-primary"><Plus className="w-4 h-4" />Add category</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c) => (
          <div key={c.id} className="card p-4 group">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.color + "22", color: c.color }}>
                <Icon name={c.icon} className="w-5 h-5" />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                <button onClick={() => setOpen(c)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-current"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(c.id)} className="p-1.5 text-black/40 dark:text-white/40 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-3 text-sm font-medium">{c.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 mt-0.5">{c.kind.toLowerCase()}</div>
          </div>
        ))}
      </div>

      {open !== null && (
        <CatModal cat={open === "new" ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

function CatModal({ cat, onClose, onSaved }: { cat: Cat | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name || "");
  const [color, setColor] = useState(cat?.color || COLOR_CHOICES[0]);
  const [icon, setIcon] = useState(cat?.icon || ICON_CHOICES[0]);
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">(cat?.kind || "EXPENSE");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    try {
      const res = await fetch(cat ? `/api/categories/${cat.id}` : "/api/categories", {
        method: cat ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, icon, kind }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={cat ? "Edit category" : "New category"} wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Name</label>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setKind("EXPENSE")} className={`px-3 py-2 rounded-lg text-sm border ${kind === "EXPENSE" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10"}`}>Expense</button>
          <button type="button" onClick={() => setKind("INCOME")} className={`px-3 py-2 rounded-lg text-sm border ${kind === "INCOME" ? "bg-black/10 dark:bg-white/10 border-black/30 dark:border-white/30" : "border-black/10 dark:border-white/10"}`}>Income</button>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_CHOICES.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black ring-current" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-black/50 dark:text-white/50">Icon</label>
          <div className="mt-2 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
            {ICON_CHOICES.map((i) => (
              <button type="button" key={i} onClick={() => setIcon(i)}
                className={`p-2 rounded-lg border ${icon === i ? "border-current bg-black/10 dark:bg-white/10" : "border-black/10 dark:border-white/10"}`}>
                <Icon name={i} className="w-4 h-4 mx-auto" />
              </button>
            ))}
          </div>
        </div>
        {err && <div className="text-sm text-rose-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
