import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      animation: {
        vinyl: "vinyl 18s linear infinite",
        breathe: "breathe 6s ease-in-out infinite",
        "float-up": "floatUp 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "rise-in": "riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        eq: "eq 0.9s ease-in-out infinite alternate",
        ripple: "ripple 1.8s ease-out infinite",
        pop: "pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        dot: "dot 1.2s ease-in-out infinite"
      },
      keyframes: {
        vinyl: { to: { transform: "rotate(360deg)" } },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.08)", opacity: "0.95" }
        },
        floatUp: {
          "0%": { transform: "translateY(0) scale(0.7)", opacity: "0" },
          "12%": { opacity: "1", transform: "translateY(-30px) scale(1.15)" },
          "100%": { transform: "translateY(-260px) scale(0.95)", opacity: "0" }
        },
        riseIn: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        eq: {
          from: { transform: "scaleY(0.25)" },
          to: { transform: "scaleY(1)" }
        },
        ripple: {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "100%": { transform: "scale(2.1)", opacity: "0" }
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" }
        },
        dot: {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.45" },
          "40%": { transform: "translateY(-4px)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
