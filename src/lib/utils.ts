// lib/utils.ts

import { clsx, type ClassValue } from 'clsx'

/** Combina classes Tailwind (usa clsx) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Distância em km entre dois pontos (Haversine) */
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** "2,4 km" ou "840 m" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/** Tamanho de ficheiro legível */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

/** Iniciais (máx 2 letras) */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

/** Data relativa: "há 2 dias" */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30)  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

/** Abre direcções no Google Maps */
export function openGoogleMaps(lat: number, lng: number): void {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  )
}

/** Verifica se MIME é imagem */
export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

/** Verifica se MIME é vídeo */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/')
}
