import { useEffect, useRef } from "react";

/** Solid celebration colours — paper, never washed out. */
const COLORS = [
  "#1805db",
  "#f43f5e",
  "#ffc2d1",
  "#e63946",
  "#e76f51",
  "#ffb703",
  "#a3e635",
  "#22c55e",
  "#f5f0e6",
];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  circle: boolean;
  sway: number;
  phase: number;
}

function spawnBurst(width: number, height: number): Piece[] {
  const pieces: Piece[] = [];
  const cx = width / 2;
  const cy = height * 0.32;
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    pieces.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
      circle: Math.random() < 0.22,
      sway: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return pieces;
}

/**
 * iMessage-style paper burst. Increment `fireKey` to celebrate.
 * Renders nothing when reduced motion is preferred.
 */
export function ConfettiBurst({ fireKey }: { fireKey: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const keyRef = useRef(fireKey);

  useEffect(() => {
    if (fireKey === keyRef.current) return;
    keyRef.current = fireKey;
    if (fireKey <= 0) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    let pieces = spawnBurst(width, height);
    let raf = 0;
    const start = performance.now();
    const DURATION = 2600;

    function frame(now: number, g: CanvasRenderingContext2D) {
      const t = now - start;
      g.clearRect(0, 0, width, height);
      const fade = t > DURATION - 600 ? Math.max(0, 1 - (t - (DURATION - 600)) / 600) : 1;
      g.globalAlpha = fade;
      pieces = pieces.filter((p) => p.y < height + 30);
      for (const p of pieces) {
        p.vy += 0.22;
        p.vx *= 0.985;
        p.vy *= 0.992;
        p.x += p.vx + Math.sin(t / 180 + p.phase) * p.sway * 0.4;
        p.y += p.vy;
        p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        if (p.circle) {
          g.beginPath();
          g.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          g.fill();
        } else {
          g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.4)) * 0.7 + p.h * 0.3);
        }
        g.restore();
      }
      g.globalAlpha = 1;
      if (t < DURATION && pieces.length > 0) {
        raf = requestAnimationFrame((t) => frame(t, g));
      } else {
        g.clearRect(0, 0, width, height);
      }
    }
    raf = requestAnimationFrame((t) => frame(t, ctx));
    return () => cancelAnimationFrame(raf);
  }, [fireKey]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
