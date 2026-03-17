import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStorage(gb: number) {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  if (gb < 1 && gb > 0) {
    return `${(gb * 1024).toFixed(0)} MB`;
  }
  return `${gb.toFixed(2)} GB`;
}

export function getStorageParts(gb: number) {
  if (gb >= 1024) {
    return { value: (gb / 1024).toFixed(2), unit: "TB" };
  }
  if (gb < 1 && gb > 0) {
    return { value: (gb * 1024).toFixed(0), unit: "MB" };
  }
  return { value: gb.toFixed(2), unit: "GB" };
}
