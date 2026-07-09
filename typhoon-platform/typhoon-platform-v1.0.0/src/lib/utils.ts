import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWindSpeed(speed: number, unit: 'knots' | 'kmh' | 'mph' = 'knots'): string {
  switch (unit) {
    case 'knots':
      return `${speed} kt`
    case 'kmh':
      return `${(speed * 1.852).toFixed(1)} km/h`
    case 'mph':
      return `${(speed * 1.15078).toFixed(1)} mph`
    default:
      return `${speed} kt`
  }
}

export function formatPressure(pressure: number): string {
  return `${pressure} hPa`
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'TROPICAL_DEPRESSION': '#3b82f6',
    'TROPICAL_STORM': '#22c55e',
    'SEVERE_TROPICAL_STORM': '#eab308',
    'TYPHOON': '#f97316',
    'SEVERE_TYPHOON': '#ef4444',
    'SUPER_TYPHOON': '#8b5cf6',
  }
  return colors[category] || '#6b7280'
}

export function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'TROPICAL_DEPRESSION': '热带低压',
    'TROPICAL_STORM': '热带风暴',
    'SEVERE_TROPICAL_STORM': '强热带风暴',
    'TYPHOON': '台风',
    'SEVERE_TYPHOON': '强台风',
    'SUPER_TYPHOON': '超强台风',
  }
  return names[category] || category
}

export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    'LOW': '#22c55e',
    'MODERATE': '#eab308',
    'HIGH': '#f97316',
    'EXTREME': '#ef4444',
  }
  return colors[level] || '#6b7280'
}

export function getRiskLevelName(level: string): string {
  const names: Record<string, string> = {
    'LOW': '低风险',
    'MODERATE': '中等风险',
    'HIGH': '高风险',
    'EXTREME': '极端风险',
  }
  return names[level] || level
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
