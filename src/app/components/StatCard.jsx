export function StatCard({ label, value, icon: Icon, trend, loading = false }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        {Icon && <Icon size={18} strokeWidth={1.75} className="text-slate-400 shrink-0" />}
      </div>
      {loading ? (
        <div className="h-7 w-28 bg-slate-100 rounded animate-pulse" />
      ) : (
        <p className="text-slate-900 text-2xl font-bold tabular-nums">{value}</p>
      )}
      {trend && <p className="text-slate-400 text-xs mt-1">{trend}</p>}
    </div>
  );
}
