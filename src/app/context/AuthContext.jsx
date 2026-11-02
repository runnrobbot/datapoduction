import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, login as authLogin, logout as authLogout } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  // beforeCommit (opsional): dijalankan setelah login valid, sebelum user di-set
  // (dipakai halaman Login untuk animasi lepas landas sebelum pindah ke dashboard)
  async function login(username, password, beforeCommit) {
    const u = await authLogin(username, password);
    if (beforeCommit) {
      try { await beforeCommit(u); } catch { /* animasi gagal tidak boleh menghalangi login */ }
    }
    setUser(u);
    return u;
  }

  function logout() {
    authLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
