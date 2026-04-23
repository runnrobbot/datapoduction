import { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

export function FirebaseSetupBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-amber-800 font-semibold" style={{ fontSize: '0.85rem' }}>Setup Firebase Diperlukan</h4>
          <p className="text-amber-700 text-xs mt-1">
            Buka file <code className="bg-amber-100 px-1 rounded font-mono">src/app/services/firebase.js</code> dan isi kredensial Firebase Anda.
          </p>
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 mt-2 underline"
          >
            Buka Firebase Console <ExternalLink size={10} />
          </a>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
