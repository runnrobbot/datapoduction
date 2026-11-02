import { Component, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

const BRAND = '#E2672D';
const BODY = '#f1f5f9';
const DARK = '#1e293b';

// Durasi animasi lepas landas (detik). Login.jsx menunggu sedikit lebih lama dari ini.
const TAKEOFF_SEC = 1.45;
const IDLE_YAW = -0.75;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.min(1, Math.max(0, v));

/* Satu baling-baling: spinner + 4 bilah, berputar pada sumbu X */
function Propeller({ position, speedRef }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * speedRef.current;
  });
  return (
    <group position={position}>
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.22, 16]} />
        <meshStandardMaterial color={BRAND} metalness={0.4} roughness={0.35} />
      </mesh>
      <group ref={ref} position={[-0.04, 0, 0]}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} rotation={[(i * Math.PI) / 2, 0, 0]}>
            <boxGeometry args={[0.02, 0.85, 0.07]} />
            <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* Pesawat turboprop low-poly, hidung menghadap +X */
function Plane({ animate, takeoff, revving }) {
  const group = useRef();
  const speedRef = useRef(animate ? 18 : 0);
  const takeoffStart = useRef(null);
  const fadeReady = useRef(false);
  const { viewport } = useThree();
  // Skala menyesuaikan ukuran kanvas (lebar & tinggi) agar pesawat selalu pas di layar mana pun
  const scale = Math.min(viewport.width / 7.2, viewport.height / 3.6);

  const windows = useMemo(() => Array.from({ length: 7 }, (_, i) => 0.85 - i * 0.32), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.getElapsedTime();

    // Kecepatan baling-baling: idle → lebih cepat saat cek login → penuh saat lepas landas
    const targetSpeed = !animate ? 0 : takeoff ? 60 : revving ? 34 : 18;
    speedRef.current = lerp(speedRef.current, targetSpeed, Math.min(1, delta * 4));

    if (takeoff && animate) {
      if (takeoffStart.current === null) takeoffStart.current = t;
      const p = clamp01((t - takeoffStart.current) / TAKEOFF_SEC);
      const e = p * p * (3 - 2 * p); // smoothstep
      const accel = p * p;           // makin lama makin cepat

      // Belok menjauh dari kamera, hidung naik, sayap miring
      g.rotation.y = lerp(g.rotation.y, 0.6, Math.min(1, delta * 3));
      g.rotation.z = lerp(0.06, 0.32, e);
      g.rotation.x = lerp(g.rotation.x, -0.35, Math.min(1, delta * 3));

      // Maju searah hidung pesawat sambil menanjak
      const dist = accel * 16;
      g.position.x = Math.cos(g.rotation.y) * dist;
      g.position.z = -Math.sin(g.rotation.y) * dist;
      g.position.y = accel * 3.2;

      // Memudar di bagian akhir supaya tidak "terpotong" oleh tepi kanvas
      if (!fadeReady.current) {
        g.traverse(o => {
          if (o.material) {
            o.material = o.material.clone();
            o.material.transparent = true;
          }
        });
        fadeReady.current = true;
      }
      const opacity = 1 - clamp01((p - 0.55) / 0.45);
      g.traverse(o => { if (o.material) o.material.opacity = opacity; });
      return;
    }

    // Mode idle: melayang dan sedikit mengikuti arah mouse
    const ptr = state.pointer || state.mouse || { x: 0, y: 0 };
    const targetY = IDLE_YAW + (animate ? ptr.x * 0.35 : 0);
    const targetX = animate ? Math.sin(t * 0.6) * 0.08 - ptr.y * 0.12 : 0;
    g.rotation.y += (targetY - g.rotation.y) * 0.05;
    g.rotation.x += (targetX - g.rotation.x) * 0.05;
    g.rotation.z = animate ? Math.sin(t * 0.8) * 0.04 + 0.06 : 0.06;
    g.position.set(0, animate ? Math.sin(t * 1.2) * 0.1 : 0, 0);
  });

  return (
    <group scale={scale}>
      <group ref={group} rotation={[0, IDLE_YAW, 0.06]}>
        {/* Badan pesawat */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.32, 2.6, 8, 24]} />
          <meshStandardMaterial color={BODY} metalness={0.25} roughness={0.35} />
        </mesh>
        {/* Ekor meruncing */}
        <mesh position={[-1.95, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.28, 0.9, 24]} />
          <meshStandardMaterial color={BODY} metalness={0.25} roughness={0.35} />
        </mesh>
        {/* Garis oranye AVTEK di sisi badan */}
        <mesh position={[0.05, -0.04, 0]}>
          <boxGeometry args={[2.7, 0.07, 0.655]} />
          <meshStandardMaterial color={BRAND} metalness={0.3} roughness={0.4} />
        </mesh>
        {/* Kaca kokpit */}
        <mesh position={[1.42, 0.13, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.22, 0.12, 0.42]} />
          <meshStandardMaterial color={DARK} metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Jendela kabin */}
        {windows.map(x => [-1, 1].map(side => (
          <mesh key={`${x}-${side}`} position={[x, 0.1, side * 0.315]}>
            <boxGeometry args={[0.12, 0.09, 0.02]} />
            <meshStandardMaterial color={DARK} metalness={0.8} roughness={0.2} />
          </mesh>
        )))}

        {/* Sayap utama (high-wing) */}
        <mesh position={[0.2, 0.3, 0]}>
          <boxGeometry args={[0.85, 0.06, 5.2]} />
          <meshStandardMaterial color={BODY} metalness={0.25} roughness={0.35} />
        </mesh>
        {/* Ujung sayap oranye */}
        {[-1, 1].map(side => (
          <mesh key={side} position={[0.2, 0.3, side * 2.55]}>
            <boxGeometry args={[0.86, 0.07, 0.12]} />
            <meshStandardMaterial color={BRAND} />
          </mesh>
        ))}

        {/* Mesin + baling-baling */}
        {[-1, 1].map(side => (
          <group key={side} position={[0.5, 0.2, side * 1.15]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.13, 0.6, 6, 16]} />
              <meshStandardMaterial color={BODY} metalness={0.35} roughness={0.3} />
            </mesh>
            <Propeller position={[0.5, 0, 0]} speedRef={speedRef} />
          </group>
        ))}

        {/* Stabilizer horizontal */}
        <mesh position={[-2.05, 0.22, 0]}>
          <boxGeometry args={[0.5, 0.04, 1.8]} />
          <meshStandardMaterial color={BODY} metalness={0.25} roughness={0.35} />
        </mesh>
        {/* Sirip tegak oranye */}
        <mesh position={[-2.1, 0.6, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.6, 0.75, 0.05]} />
          <meshStandardMaterial color={BRAND} metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/* Jika WebGL tidak tersedia, sembunyikan saja tanpa merusak halaman login */
class WebGLBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Airplane3D({ className = '', takeoff = false, revving = false }) {
  const animate = useMemo(
    () => typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <div className={className} aria-hidden="true">
      <WebGLBoundary>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 2.6, 6], fov: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          frameloop={animate ? 'always' : 'demand'}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 5]} intensity={1.4} />
          <directionalLight position={[-5, 2, -3]} intensity={0.5} color={BRAND} />
          <Plane animate={animate} takeoff={takeoff} revving={revving} />
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
