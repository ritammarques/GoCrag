'use client'

// components/spot/SpotCard.tsx

import { Heart, ChevronRight } from 'lucide-react'
import { ConditionBadge, Tag } from '@/components/ui'
import { formatDistance } from '@/lib/utils'
import type { SpotWithCondition } from '@/types'

interface SpotCardProps {
  spot: SpotWithCondition
  onSelect: (id: string) => void
  onFavorite?: (id: string, current: boolean) => void
  isLoggedIn?: boolean
  selected?: boolean
}

export function SpotCard({
  spot,
  onSelect,
  onFavorite,
  isLoggedIn,
  selected,
}: SpotCardProps) {
  const condition = spot.condition

  return (
    <button
      onClick={() => onSelect(spot.id)}
      className={[
        'w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all',
        selected
          ? 'border-brand-600 bg-brand-50'
          : 'border-neutral-100 bg-white hover:border-brand-200 active:scale-[.99]',
      ].join(' ')}
      type="button"
    >
      {/* Indicador de condição */}
      <div
        className={[
          'w-2 h-10 rounded-full flex-shrink-0',
          condition?.status === 'good'
            ? 'bg-good'
            : condition?.status === 'ok'
            ? 'bg-ok'
            : 'bg-bad',
        ].join(' ')}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {spot.name}
          </p>
          {condition && (
            <ConditionBadge status={condition.status} className="flex-shrink-0" />
          )}
        </div>

        <p className="text-xs text-neutral-500 mt-0.5 truncate">{spot.location}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {spot.rock_type && <Tag>{spot.rock_type}</Tag>}
          {spot.level_min && spot.level_max && (
            <Tag>
              {spot.level_min}–{spot.level_max}
            </Tag>
          )}
          {spot.distance != null && (
            <span className="text-[11px] text-neutral-400 font-medium">
              📍 {formatDistance(spot.distance)}
            </span>
          )}
        </div>

        {spot.weather && (
          <p className="text-[11px] text-neutral-400 mt-1">
            🌡 {spot.weather.temp}°C &middot; 💧 {spot.weather.humidity}% &middot; 💨{' '}
            {spot.weather.wind_speed} km/h
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {isLoggedIn && onFavorite && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onFavorite(spot.id, spot.isFavorite)
            }}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label={spot.isFavorite ? 'Remover favorito' : 'Adicionar favorito'}
          >
            <Heart
              size={16}
              className={
                spot.isFavorite
                  ? 'fill-red-500 text-red-500'
                  : 'text-neutral-300'
              }
            />
          </button>
        )}
        <ChevronRight size={16} className="text-neutral-300" />
      </div>
    </button>
  )
}
