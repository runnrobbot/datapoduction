/**
 * motionComponents.jsx
 * Reusable motion wrappers pakai `motion` package (Framer Motion v12).
 */
import { motion } from 'framer-motion';

/* ─── Page fade-slide-in ───────────────────────────────── */
export function PageMotion({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Staggered list container ────────────────────────── */
export function StaggerList({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.07 } }
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Individual stagger item ─────────────────────────── */
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated stat card ──────────────────────────────── */
export function AnimatedCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Fade in ─────────────────────────────────────────── */
export function FadeIn({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Slide in from left (sidebar) ──────────────────── */
export function SlideInLeft({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Number counter animation ───────────────────────── */
export function CountUp({ value, className = '' }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      key={value}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {value}
    </motion.span>
  );
}

/* ─── Pulse dot (realtime indicator) ─────────────────── */
export function RealtimeDot() {
  return (
    <span className="relative inline-flex h-2 w-2 ml-1.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}
