export default function ScenariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-44 rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="grid lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 h-32">
            <div className="h-3 w-32 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-7 w-24 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-4 h-2 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="card p-5 h-80">
        <div className="h-64 mt-4 rounded-lg bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}
