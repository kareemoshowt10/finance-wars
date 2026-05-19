export default function InsightsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-40 rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="grid md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-40">
            <div className="h-3 w-32 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-24 rounded bg-black/5 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
