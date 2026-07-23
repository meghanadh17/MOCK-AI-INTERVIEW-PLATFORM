import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTextOrObject(item: any): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    // If it's a strength object
    if ('strength' in item) {
      if (item.evidence) {
        return `${item.strength} (Evidence: ${item.evidence})`;
      }
      return item.strength;
    }
    // If it's a gap object
    if ('gap' in item) {
      if (item.recommendation) {
        return `${item.gap} (Recommendation: ${item.recommendation})`;
      }
      return item.gap;
    }
    // General fallback for any other object shape
    const vals = Object.values(item).filter(v => typeof v === 'string');
    if (vals.length > 0) {
      return vals.join(' — ');
    }
    return JSON.stringify(item);
  }
  return String(item);
}