export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
          <div className="h-6 w-32 rounded bg-white/[0.06]" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {...Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
