import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function SearchDropdown({ barangList, value, onChange, placeholder = 'Cari kode atau nama barang...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.length === 0
    ? barangList.slice(0, 20)
    : barangList
        .filter(b =>
          (b.kode && b.kode.toLowerCase().includes(query.toLowerCase())) ||
          b.nama.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 30);

  function handleSelect(barang) {
    setSelected(barang);
    setQuery('');
    setOpen(false);
    onChange(barang);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    onChange(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-emerald-50 border-emerald-300">
          <div>
            <span className="text-sm text-emerald-700 font-mono font-semibold">{selected.kode || '—'}</span>
            <span className="text-sm text-slate-700 ml-2">{selected.nama}</span>
            <span className="ml-2 text-xs text-slate-500">Stok: {selected.stok}</span>
          </div>
          <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600 ml-2">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">Barang tidak ditemukan</div>
            ) : (
              filtered.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={() => handleSelect(b)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-emerald-600">{b.kode || '—'}</span>
                      <span className="text-sm text-slate-700 ml-2">{b.nama}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.stok > 10 ? 'bg-emerald-50 text-emerald-600' :
                      b.stok > 0 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      {b.stok} {b.satuan}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
