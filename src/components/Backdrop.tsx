"use client";

import { useEffect, useRef } from "react";
import type { TimeOfDay } from "@/lib/types";

const IMAGES: Record<TimeOfDay, string> = {
  day: "/bg-day.jpg",
  sunset: "/bg-sunset.jpg",
  night: "/bg-night.jpg"
};

export function resolveTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 6 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

interface BackdropProps {
  time: TimeOfDay | null;
  playing: boolean;
  rainIntensity?: number;
}

/** Full-bleed rooftop scene that follows the clock, with warm motes and optional gentle rain. */
export function Backdrop({ time, playing, rainIntensity = 0 }: BackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(time);
  const playingRef = useRef(playing);
  const rainRef = useRef(rainIntensity);
  timeRef.current = time;
  playingRef.current = playing;
  rainRef.current = rainIntensity;

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

    const motes = Array.from({ length: 34 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.7 + 0.6,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.22,
      alpha: 0.2 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2
    }));

    // Pre-seeded pool of delicate diagonal raindrops across depth planes
    const MAX_DROPS = 90;
    const drops = Array.from({ length: MAX_DROPS }, () => {
      const depth = 0.35 + Math.random() * 0.65;
      return {
        x: Math.random() * (width + 200),
        y: Math.random() * height,
        depth,
        len: 12 + depth * 18,
        speed: 6.5 + depth * 8.5,
        opacity: 0.1 + depth * 0.18
      };
    });

    const ripples: { x: number; y: number; r: number; maxR: number; alpha: number }[] = [];
    let smoothRain = rainRef.current;

    let frame = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      smoothRain += (rainRef.current - smoothRain) * 0.06;
      const speed = playingRef.current ? 1 : 0.45;
      const tone =
        timeRef.current === "night"
          ? "214, 232, 255"
          : timeRef.current === "day"
            ? "255, 255, 255"
            : "255, 196, 132";

      // 1. Floating warm motes (slightly calmer when raining)
      const moteDim = 1 - smoothRain * 0.45;
      for (const m of motes) {
        m.x += m.vx * speed;
        m.y += m.vy * speed;
        m.phase += 0.02;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        const twinkle = (Math.sin(m.phase) + 1) / 2;
        ctx.fillStyle = `rgba(${tone}, ${m.alpha * (0.25 + twinkle * 0.6) * moteDim})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Slight, cozy atmospheric rain when active
      if (smoothRain > 0.01) {
        const activeCount = Math.max(18, Math.round(MAX_DROPS * Math.min(1, smoothRain * 1.15)));
        const windX = -0.16; // gentle diagonal slant

        ctx.lineCap = "round";
        for (let i = 0; i < activeCount; i++) {
          const d = drops[i];
          d.y += d.speed * (0.8 + smoothRain * 0.35);
          d.x += d.speed * windX;

          if (d.y > height + 20 || d.x < -40) {
            // Occasional tiny terrace splash near the lower fifth of the screen
            if (ripples.length < 14 && Math.random() < 0.22 * smoothRain) {
              ripples.push({
                x: Math.max(20, Math.min(width - 20, d.x)),
                y: height * (0.82 + Math.random() * 0.15),
                r: 1,
                maxR: 6 + d.depth * 8,
                alpha: 0.16 * smoothRain
              });
            }
            d.y = -d.len - Math.random() * 60;
            d.x = Math.random() * (width + 180);
          }

          const tailX = d.x - d.len * windX;
          const tailY = d.y - d.len;
          const alpha = d.opacity * Math.min(1, smoothRain * 1.3);

          const grad = ctx.createLinearGradient(tailX, tailY, d.x, d.y);
          grad.addColorStop(0, "rgba(220, 236, 255, 0)");
          grad.addColorStop(1, `rgba(228, 240, 255, ${alpha})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.75 + d.depth * 0.55;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(d.x, d.y);
          ctx.stroke();
        }

        // Subtle terrace droplet ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += 0.35;
          const progress = rp.r / rp.maxR;
          if (progress >= 1) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(228, 240, 255, ${rp.alpha * (1 - progress)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
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
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#140d10]">
      {(Object.keys(IMAGES) as TimeOfDay[]).map((key) => (
        <div
          key={key}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1600ms] ease-in-out ${
            time === key ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${IMAGES[key]}')` }}
        />
      ))}

      {/* Slight cool-blue atmospheric veil when it's raining */}
      <div
        className="absolute inset-0 bg-[#121c2c] transition-opacity duration-1000"
        style={{ opacity: rainIntensity > 0 ? Math.min(0.16, rainIntensity * 0.2) : 0 }}
      />

      {/* Warm vignette keeps the focus on the middle and the edges calm. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f12]/20 via-transparent to-[#1a0f12]/48" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(20,10,12,0.38)_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-90" />
    </div>
  );
}
