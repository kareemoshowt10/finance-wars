export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 h-24">
            <div className="h-3 w-20 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-7 w-24 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="card p-5 h-72">
        <div className="h-3 w-40 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-4 h-56 rounded-lg bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}
