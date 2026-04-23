export function LoadingTable({ cols = 5, rows = 8 }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-100 rounded flex-1" style={{ opacity: 1 - j * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
