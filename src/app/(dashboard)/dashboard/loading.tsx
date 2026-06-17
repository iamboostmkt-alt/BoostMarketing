export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
          <div className="h-6 w-36 rounded bg-white/[0.06]" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
