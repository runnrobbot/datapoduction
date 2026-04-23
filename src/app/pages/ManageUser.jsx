import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, User, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, addUser, updateUser, deleteUser } from '../services/authService';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin' };
const ROLE_CLASS = {
  super_admin: 'bg-violet-50 text-violet-700 border border-violet-100',
  admin:       'bg-blue-50 text-blue-700 border border-blue-100',
};

const INIT_FORM = { nama: '', username: '', password: '', role: 'admin' };

export default function ManageUser() {
  const { user: currentUser } = useAuth();
  const [list, setList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setList(getAllUsers());
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(INIT_FORM);
    setShowPass(false);
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(u) {
    setForm({ nama: u.nama, username: u.username, password: '', role: u.role });
    setShowPass(false);
    setEditTarget(u);
    setModalOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim())     { toast.error('Nama wajib diisi'); return; }
    if (!form.username.trim()) { toast.error('Username wajib diisi'); return; }
    if (!editTarget && !form.password) { toast.error('Password wajib diisi'); return; }

    setSaving(true);
    try {
      if (editTarget) {
        updateUser(editTarget.id, {
          nama: form.nama,
          username: form.username,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('User berhasil diperbarui');
      } else {
        addUser(form);
        toast.success('User berhasil ditambahkan');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    try {
      deleteUser(deleteTarget.id);
      toast.success('User dihapus');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Guard: only super_admin can access
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <Shield size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-slate-700 font-semibold">Akses Ditolak</h2>
          <p className="text-slate-400 text-sm mt-1">Hanya Super Admin yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-700">Manajemen User</h2>
          <p className="text-xs text-slate-400 mt-0.5">{list.length} akun terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium">
            <Plus size={14} /> Tambah User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Nama', 'Username', 'Role', 'Dibuat', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">Belum ada user</td></tr>
              ) : list.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.role === 'super_admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{u.nama}</p>
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-emerald-600 font-medium">● Anda</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-600">{u.username}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_CLASS[u.role]}`}>
                      {u.role === 'super_admin' ? <Shield size={10} /> : <User size={10} />}
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(u)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">
                        <Edit2 size={11} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUser?.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={11} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit User' : 'Tambah User Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
            <input type="text" value={form.nama}
              onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
              placeholder="Cth: Budi Santoso" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Username <span className="text-red-500">*</span></label>
            <input type="text" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Cth: budi123" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">
              Password {editTarget && <span className="text-xs text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>}
              {!editTarget && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editTarget ? 'Biarkan kosong jika tidak diubah' : 'Masukkan password'}
                required={!editTarget}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Role <span className="text-red-500">*</span></label>
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Menyimpan…' : editTarget ? 'Perbarui' : 'Tambah User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus User"
        message={`Hapus akun "${deleteTarget?.nama}" (${deleteTarget?.username})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus User"
      />
    </div>
  );
}
