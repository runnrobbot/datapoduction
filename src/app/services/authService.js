const USERS_KEY  = 'dp_users';
const SESSION_KEY = 'dp_session';

function seedUsers() {
  if (!localStorage.getItem(USERS_KEY)) {
    const defaults = [
      {
        id: 'u-1',
        username: 'superadmin',
        password: 'admin123',
        nama: 'Super Administrator',
        role: 'super_admin',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  }
}

function getUsers() {
  seedUsers();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function login(username, password) {
  const users = getUsers();
  const user = users.find(
    u => u.username === username && u.password === password
  );
  if (!user) throw new Error('Username atau password salah');
  const session = { ...user };
  delete session.password;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isSuperAdmin() {
  const u = getCurrentUser();
  return u?.role === 'super_admin';
}

export function getAllUsers() {
  return getUsers().map(u => {
    const { password, ...safe } = u;
    return safe;
  });
}

export function addUser(data) {
  const users = getUsers();
  if (users.find(u => u.username === data.username)) {
    throw new Error('Username sudah dipakai');
  }
  const newUser = {
    id: `u-${Date.now()}`,
    username: data.username.trim(),
    password: data.password,
    nama: data.nama.trim(),
    role: data.role || 'admin',
    created_at: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);
  return newUser;
}

export function updateUser(id, data) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User tidak ditemukan');

  const session = getCurrentUser();
  if (session?.id === id && data.role && data.role !== users[idx].role) {
    throw new Error('Tidak bisa mengubah role sendiri');
  }

  if (data.username && users.some(u => u.username === data.username && u.id !== id)) {
    throw new Error('Username sudah dipakai');
  }

  users[idx] = {
    ...users[idx],
    ...(data.nama     ? { nama: data.nama.trim() }         : {}),
    ...(data.username ? { username: data.username.trim() } : {}),
    ...(data.password ? { password: data.password }        : {}),
    ...(data.role     ? { role: data.role }                : {}),
  };
  saveUsers(users);

  if (session?.id === id) {
    const { password, ...safe } = users[idx];
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  }
  return users[idx];
}

export function deleteUser(id) {
  const session = getCurrentUser();
  if (session?.id === id) throw new Error('Tidak bisa menghapus akun sendiri');
  const users = getUsers();
  saveUsers(users.filter(u => u.id !== id));
}
