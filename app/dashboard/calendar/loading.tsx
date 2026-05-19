export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-40 rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-black/5 dark:border-white/5">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-8 border-r border-black/5 dark:border-white/5" />)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-24 border-r border-b border-black/5 dark:border-white/5 p-2">
              <div className="h-3 w-5 rounded bg-black/10 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
