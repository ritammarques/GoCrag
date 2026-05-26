'use client'

// hooks/useGeolocation.ts


import { useState, useCallback } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
  // Posição padrão: Lisboa (usada como fallback)
  isDefault: boolean
}

// Posição padrão: centro de Portugal (Lisboa)
export const DEFAULT_LAT = 38.7369
export const DEFAULT_LNG = -9.1395

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    loading: false,
    error: null,
    isDefault: true,
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalização não suportada neste browser' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
          isDefault: false,
        })
      },
      (err) => {
        let message = 'Não foi possível obter a localização'
        if (err.code === err.PERMISSION_DENIED) message = 'Permissão de localização negada'
        if (err.code === err.TIMEOUT)           message = 'Timeout a obter localização'
        setState(prev => ({ ...prev, loading: false, error: message }))
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 } // cache 5 min
    )
  }, [])

  return { ...state, requestLocation }
}
