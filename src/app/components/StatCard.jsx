export function StatCard({ label, value, icon: Icon, color = 'emerald', trend, loading = false }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-100' }
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${c.bg} border ${c.border} rounded-lg flex items-center justify-center`}>
          {Icon && <Icon size={18} className={c.icon} />}
        </div>
      </div>
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-28 bg-slate-100 rounded animate-pulse" />
        ) : (
          <p className="text-slate-900 text-2xl font-bold">{value}</p>
        )}
        {trend && <p className="text-slate-400 text-xs mt-1">{trend}</p>}
      </div>
    </div>
  );
}
