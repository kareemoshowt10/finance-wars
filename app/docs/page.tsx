"use client";
import { useEffect, useState } from "react";

type Param = { name: string; in: string; required?: boolean; schema?: { type?: string } };
type Op = { summary?: string; tags?: string[]; parameters?: Param[] };
type Path = { [method: string]: Op };
type Spec = {
  info: { title: string; version: string; description?: string };
  tags: { name: string; description?: string }[];
  paths: Record<string, Path>;
};

const METHOD_COLORS: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-500",
  post: "bg-blue-500/15 text-blue-500",
  patch: "bg-amber-500/15 text-amber-500",
  put: "bg-amber-500/15 text-amber-500",
  delete: "bg-rose-500/15 text-rose-500",
};

export default function DocsPage() {
  const [spec, setSpec] = useState<Spec | null>(null);

  useEffect(() => {
    fetch("/openapi").then((r) => r.json()).then(setSpec).catch(() => {});
  }, []);

  if (!spec) return <div className="p-10 text-sm text-black/40 dark:text-white/40">Loading API spec…</div>;

  // Group by tag
  const byTag: Record<string, { path: string; method: string; op: Op }[]> = {};
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const tag = op.tags?.[0] || "other";
      byTag[tag] = byTag[tag] || [];
      byTag[tag].push({ path, method, op });
    }
  }

  return (
    <div className="min-h-screen px-6 md:px-10 py-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{spec.info.title}</h1>
        <p className="text-black/50 dark:text-white/50 mt-1 text-sm">{spec.info.description}</p>
        <p className="text-black/40 dark:text-white/40 mt-2 text-xs">Version {spec.info.version}</p>
        <p className="text-black/60 dark:text-white/60 mt-4 text-sm">
          Authenticate with a bearer API token (issue one in <a href="/dashboard/settings" className="underline">Settings</a>) or session cookie.
          Raw spec: <a href="/openapi" className="underline">/openapi</a>.
        </p>
      </header>

      {Object.entries(byTag).map(([tag, ops]) => (
        <section key={tag} className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50 mb-3">{tag}</h2>
          <div className="card divide-y divide-black/5 dark:divide-white/5">
            {ops.map((o, i) => (
              <div key={i} className="px-4 py-3 flex flex-wrap items-start gap-3">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${METHOD_COLORS[o.method] || "bg-black/10 dark:bg-white/10"}`}>{o.method}</span>
                <code className="text-sm font-mono">{o.path}</code>
                <div className="text-xs text-black/60 dark:text-white/60 flex-1 basis-full md:basis-auto md:flex-none">{o.op.summary}</div>
                {o.op.parameters && o.op.parameters.length > 0 && (
                  <div className="basis-full text-xs text-black/50 dark:text-white/50 pl-12">
                    Params: {o.op.parameters.map((p) => <span key={p.name} className="font-mono mr-2">{p.name}{p.required ? "*" : ""}({p.in})</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
