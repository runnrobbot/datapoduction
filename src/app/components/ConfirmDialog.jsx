import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title = 'Konfirmasi', message, confirmLabel = 'Hapus', confirmVariant = 'danger' }) {
  if (!isOpen) return null;

  const btnClasses = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6"
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-slate-800 mb-1" style={{ fontWeight: 600 }}>{title}</h4>
            <p className="text-slate-500 text-sm">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${btnClasses[confirmVariant] || btnClasses.danger}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
