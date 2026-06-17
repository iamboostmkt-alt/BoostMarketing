export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-[var(--wl-hover)]" />
          <div className="h-6 w-28 rounded bg-[var(--wl-hover)]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[var(--wl-hover)]" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-xl bg-[var(--wl-hover)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <div className="h-5 w-20 rounded bg-[var(--wl-hover)]" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--wl-hover)]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
