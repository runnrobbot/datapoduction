import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Dimuat terpisah agar three.js tidak memperberat bundle utama
const Airplane3D = lazy(() => import('../components/Airplane3D'));

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = e => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

function FloatingOrb({ className, delay = 0 }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -24, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// Durasi animasi lepas landas sebelum masuk ke dashboard
const TAKEOFF_MS = 1600;
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [takeoff, setTakeoff]   = useState(false);
  const isDesktop = useIsDesktop();

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      // Setelah username & password valid, pesawat lepas landas dulu, baru masuk dashboard
      await login(username.trim(), password, async () => {
        setTakeoff(true);
        await new Promise(r => setTimeout(r, prefersReducedMotion() ? 0 : TAKEOFF_MS));
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-brand-500 selection:text-white overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Left Panel */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <FloatingOrb delay={0} className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-600/20 blur-[120px]" />
        <FloatingOrb delay={2} className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-brand-500/20 blur-[100px]" />
        <FloatingOrb delay={4} className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] bg-[length:32px_32px]" />
        <div className="relative z-10 px-12 xl:px-16 py-10 [@media(max-height:820px)]:py-6 max-w-2xl w-full">
          <motion.div className="flex items-center gap-4 mb-8 [@media(max-height:820px)]:mb-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <motion.img
              src="/logo-utama.png"
              alt="Avtek Transutama"
              className="w-16 h-16 object-contain"
              whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}
            />
            <div>
              <span className="block text-2xl font-bold text-white tracking-tight leading-none">Data Production</span>
              <span className="block text-xs font-bold text-brand-400 uppercase tracking-widest mt-1.5">By Avtek Transutama</span>
            </div>
          </motion.div>

          <motion.h1 className="text-4xl xl:text-5xl [@media(max-height:820px)]:text-3xl font-extrabold text-white leading-tight mb-4" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
            Aviation Parts <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">Inventory Management</span>
          </motion.h1>

          <motion.p className="text-base xl:text-lg text-slate-300 mb-2 max-w-lg leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }}>
            Track aircraft and helicopter engines, components and spare parts, from purchase order and receiving inspection to stock and sales.
          </motion.p>

          {isDesktop && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.6 }}>
              <Suspense fallback={<div className="h-72 [@media(max-height:820px)]:h-56 [@media(min-height:950px)]:h-96" />}>
                <Airplane3D takeoff={takeoff} revving={loading} className="w-full h-72 [@media(max-height:820px)]:h-56 [@media(min-height:950px)]:h-96" />
              </Suspense>
            </motion.div>
          )}

        </div>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white lg:bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div className="absolute top-8 left-6 flex lg:hidden items-center gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <img src="/logo-utama.png" alt="Avtek Transutama" className="w-12 h-12 object-contain" />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">Data Production</span>
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mt-1">By Avtek Transutama</span>
          </div>
        </motion.div>

        <div className="w-full max-w-md">
          {!isDesktop && (
            <motion.div
              className="relative mt-16 mb-6 rounded-2xl bg-slate-900 overflow-hidden"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-brand-600/30 blur-3xl" />
              <Suspense fallback={<div className="h-36 sm:h-48" />}>
                <Airplane3D takeoff={takeoff} revving={loading} className="relative w-full h-36 sm:h-48" />
              </Suspense>
            </motion.div>
          )}

          <motion.div className="mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.45 }}>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500">Please enter your credentials to access your account.</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 overflow-hidden"
                initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form onSubmit={handleSubmit} className="space-y-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.45 }}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username" required autoFocus
                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all duration-200 pr-12"
                />
                <motion.button type="button" onClick={() => setShowPass(v => !v)} whileTap={{ scale: 0.85 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </motion.button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-semibold overflow-hidden shadow-lg shadow-slate-900/10 mt-2 disabled:opacity-70 disabled:pointer-events-none"
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-500"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <motion.span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                    {takeoff ? 'Taking off...' : 'Signing in...'}
                  </>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </span>
            </motion.button>
          </motion.form>

          <motion.p className="mt-8 text-center text-sm text-slate-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            Don't have an account?{' '}
            <a href="#" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline underline-offset-4 transition-all">Contact Administrator</a>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
