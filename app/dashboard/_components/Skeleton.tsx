import { cn } from "@/lib/utils";

/** A single pulsing placeholder bar. Compose these into page-shaped skeletons below. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.06]", className)} />;
}

/** Loading state for a page that's mostly a stack of full-width cards (Chores, Bank, Goals lists). */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-9 w-24 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loading state for the Household HQ overview: the 3 stat tiles + Today panel shape. */
export function SkeletonOverview() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="card p-6 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
