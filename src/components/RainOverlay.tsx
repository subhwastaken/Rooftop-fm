"use client";

import { useEffect, useRef } from "react";

interface RainOverlayProps {
  intensity: number;
}

/**
 * Delicate, slight diagonal rain across the screen when rain ambience is active.
 * Strictly pointer-events-none so it never intercepts clicks or scrolling.
 */
export function RainOverlay({ intensity }: RainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const MAX_DROPS = 68;
    const drops = Array.from({ length: MAX_DROPS }, () => {
      const depth = 0.35 + Math.random() * 0.65;
      return {
        x: Math.random() * (width + 220),
        y: Math.random() * height,
        depth,
        len: 15 + depth * 22,
        speed: 7.5 + depth * 9.5,
        opacity: 0.14 + depth * 0.22
      };
    });

    const splashes: { x: number; y: number; r: number; maxR: number; alpha: number }[] = [];
    let smooth = intensityRef.current;
    let frame = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      smooth += (intensityRef.current - smooth) * 0.07;

      if (smooth > 0.01) {
        const count = Math.max(16, Math.round(MAX_DROPS * Math.min(1, smooth * 1.15)));
        const wind = -0.15;

        ctx.lineCap = "round";
        for (let i = 0; i < count; i++) {
          const d = drops[i];
          d.y += d.speed * (0.82 + smooth * 0.32);
          d.x += d.speed * wind;

          if (d.y > height + 24 || d.x < -50) {
            if (splashes.length < 16 && Math.random() < 0.25 * smooth) {
              splashes.push({
                x: Math.max(20, Math.min(width - 20, d.x)),
                y: height - 6 - Math.random() * 26,
                r: 1,
                maxR: 5 + d.depth * 8,
                alpha: 0.22 * smooth
              });
            }
            d.y = -d.len - Math.random() * 80;
            d.x = Math.random() * (width + 200);
          }

          const tailX = d.x - d.len * wind;
          const tailY = d.y - d.len;
          const alpha = d.opacity * Math.min(1, smooth * 1.35);

          const grad = ctx.createLinearGradient(tailX, tailY, d.x, d.y);
          grad.addColorStop(0, "rgba(220, 238, 255, 0)");
          grad.addColorStop(1, `rgba(226, 242, 255, ${alpha})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.85 + d.depth * 0.55;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }

        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.r += 0.35;
          const p = s.r / s.maxR;
          if (p >= 1) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(226, 242, 255, ${s.alpha * (1 - p)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.r, s.r * 0.28, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-20 h-full w-full transition-opacity duration-700 ${
        intensity > 0 ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

