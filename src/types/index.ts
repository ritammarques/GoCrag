// ═══════════════════════════════════════════════════════
// GoCrag — Tipos TypeScript globais
// ═══════════════════════════════════════════════════════

// ─── Base de Dados ──────────────────────────────────────

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  level: string
  created_at: string
}

export interface Spot {
  id: string
  name: string
  description: string | null
  location: string | null
  lat: number
  lng: number
  rock_type: string | null
  level_min: string | null
  level_max: string | null
  style: string
  walk_time: string | null
  how_to_get: string | null
  cover_url: string | null
  added_by: string | null
  is_published: boolean
  created_at: string
  // Relações opcionais (quando carregadas com join)
  sectors?: Sector[]
  uploads?: Upload[]
  notes?: Note[]
}

export interface Sector {
  id: string
  spot_id: string
  name: string
  description: string | null
  order_index: number
  cover_url: string | null
  created_at: string
  // Relações opcionais
  challenges?: Challenge[]
  uploads?: Upload[]
}

export interface Challenge {
  id: string
  sector_id: string
  spot_id: string
  name: string
  grade: string | null
  description: string | null
  style: string | null
  height_m: number | null
  landing: string | null
  added_by: string | null
  order_index: number
  created_at: string
  // Relações opcionais
  uploads?: Upload[]
  notes?: Note[]
}

export interface Upload {
  id: string
  user_id: string
  spot_id: string | null
  sector_id: string | null
  challenge_id: string | null
  file_type: 'photo' | 'video' | 'doc' | 'croqis'
  file_name: string
  storage_path: string
  public_url: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  // Relação opcional
  profile?: Profile
}

export interface Note {
  id: string
  user_id: string
  spot_id: string | null
  sector_id: string | null
  challenge_id: string | null
  content: string
  rating: number | null
  condition_tag: ConditionStatus | null
  created_at: string
  // Relação opcional
  profile?: Profile
}

export interface Favorite {
  user_id: string
  spot_id: string
  created_at: string
}

// ─── Weather ────────────────────────────────────────────

export interface WeatherData {
  temp: number          // °C
  feels_like: number    // °C
  humidity: number      // %
  wind_speed: number    // km/h
  rain_1h: number       // mm/h (0 se não houver)
  description: string   // ex: "céu limpo"
  icon: string          // código do ícone OWM
  fetched_at: number    // timestamp Unix
}

export interface WeatherError {
  message: string
  code?: string
}

export type WeatherResult =
  | { data: WeatherData; error: null }
  | { data: null; error: WeatherError }

// ─── Condições / Score ──────────────────────────────────

export type ConditionStatus = 'good' | 'ok' | 'bad'

export interface ConditionScore {
  status: ConditionStatus
  score: number          // 0-100
  label: string          // ex: "Bom para escalar"
  labelShort: string     // ex: "Bom"
  reasons: string[]      // ex: ["Chuva intensa"]
}

// ─── Spot enriquecido (usado na UI) ────────────────────

export interface SpotWithCondition extends Spot {
  weather: WeatherData | null
  weatherError: WeatherError | null
  condition: ConditionScore | null
  distance: number | null    // km
  isFavorite: boolean
}

// ─── Upload (formulário) ───────────────────────────────

export interface UploadTarget {
  spotId?: string
  sectorId?: string
  challengeId?: string
}

export type UploadFileType = 'photo' | 'video' | 'doc' | 'croqis'

// ─── Navegação ──────────────────────────────────────────

export type TabRoute = 'map' | 'explore' | 'favorites' | 'profile'
