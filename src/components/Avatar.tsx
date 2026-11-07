"use client";

import { resolveAvatarUrl } from "@/lib/identity";

interface AvatarProps {
  src?: string;
  name?: string;
  className?: string;
  size?: number;
  priority?: boolean;
}

export function Avatar({ src, name, className = "", size = 48, priority = false }: AvatarProps) {
  const url = resolveAvatarUrl(src, name);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ? `${name}'s avatar` : "Avatar"}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      className={`select-none object-cover ${className}`}
      draggable={false}
    />
  );
}
