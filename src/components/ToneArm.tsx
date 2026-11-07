"use client";

import React from "react";

interface ToneArmProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
}

export function ToneArm({ isPlaying, progress }: ToneArmProps) {
  // When parked (paused): rested at -4deg in the cute little rest cradle
  // When playing: drops onto the outer grooves (10deg) and slowly glides toward inner grooves (17deg)
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const armAngle = isPlaying ? 10 + clampedProgress * 7 : -4;

  return (
    <div
      className="pointer-events-none absolute -right-[10%] -top-[5%] z-20 h-[86%] w-[42%]"
      style={{
        filter: "drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55))",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 130 260"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* --- Hand-drawn Style Fixed Base & Rest Cradle --- */}
        {/* Circular base mounting puck */}
        <circle
          cx="86"
          cy="38"
          r="14.5"
          fill="#2a181e"
          stroke="#fff4e6"
          strokeWidth="2.5"
        />
        <circle cx="86" cy="38" r="7.5" fill="#ffb36b" />
        <circle cx="86" cy="38" r="2.5" fill="#2a181e" />

        {/* Minimalist rest stand cradle (parks the arm when paused) */}
        <line
          x1="85"
          y1="94"
          x2="85"
          y2="108"
          stroke="#fff4e6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 80 96 Q 85 100 90 96"
          stroke="#fff4e6"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* --- Rotating Hand-drawn Tonearm Assembly --- */}
        <g
          style={{
            transformOrigin: "86px 38px",
            transform: `rotate(${armAngle}deg)`,
            transition: "transform 0.85s cubic-bezier(0.25, 1, 0.45, 1)",
          }}
        >
          {/* Cute rear counterweight */}
          <rect
            x="79"
            y="11"
            width="14"
            height="14"
            rx="4"
            fill="#ffb36b"
            stroke="#2a181e"
            strokeWidth="2"
          />
          <line
            x1="86"
            y1="25"
            x2="86"
            y2="38"
            stroke="#fff4e6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Simple warm cream hand-drawn arm tube */}
          <path
            d="M 86 38 
               L 86 68 
               C 86 110 74 140 64 170 
               C 56 190 53 210 53 226"
            stroke="#fff4e6"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Cozy illustrated Cartridge & Headshell */}
          <g transform="translate(53, 226) rotate(10)">
            {/* Headshell body */}
            <rect
              x="-5"
              y="2"
              width="10"
              height="16"
              rx="3.5"
              fill="#ff9e7d"
              stroke="#2a181e"
              strokeWidth="2"
            />
            {/* Cute finger lift handle */}
            <path
              d="M 5 8 Q 10 8 9 4"
              stroke="#fff4e6"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Stylus needle tip */}
            <circle cx="0" cy="20" r="1.5" fill="#fff4e6" />
            {/* Subtle cozy needle glow when playing */}
            {isPlaying && (
              <circle
                cx="0"
                cy="20"
                r="3.5"
                fill="#ffb36b"
                opacity="0.65"
                className="animate-pulse"
              />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
