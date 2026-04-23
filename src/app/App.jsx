import { RouterProvider } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { router } from './routes.jsx';
import Login from './pages/Login';

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
