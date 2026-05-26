'use client'

// components/map/MapView.tsx
// Mapa Leaflet com clustering — carregado APENAS no cliente via dynamic import.
// Leaflet e leaflet.markercluster dependem de `window` e `document`.
// Este componente NUNCA corre no servidor.


import { useEffect, useRef, useCallback } from 'react'
import type { SpotWithCondition } from '@/types'

// Tipos mínimos para Leaflet (evita problemas de import SSR)
type LeafletMap     = any
type LeafletCluster = any

interface MapViewProps {
  spots: SpotWithCondition[]
  selectedSpotId: string | null
  onSpotSelect: (spotId: string) => void
  userLat?: number | null
  userLng?: number | null
  className?: string
}

export function MapView({
  spots,
  selectedSpotId,
  onSpotSelect,
  userLat,
  userLng,
  className = '',
}: MapViewProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<LeafletMap>(null)
  const clusterRef    = useRef<LeafletCluster>(null)
  const userMarkerRef = useRef<any>(null)
  const initialised   = useRef(false)

  // ── Inicializa o mapa uma única vez ──────────────────
  useEffect(() => {
    if (initialised.current || !containerRef.current) return

    // Importação dinâmica de Leaflet + plugin só no browser
    let cancelled = false

    async function init() {
      // Importa Leaflet como módulo (não via CDN) — garante que funciona
      // no build do Next.js sem depender de window.L
      const L = (await import('leaflet')).default

      // Fix para o ícone padrão do Leaflet quebrado com webpack
      // (o Leaflet tenta carregar imagens via URL relativa que o webpack altera)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Importa o plugin markercluster
      await import('leaflet.markercluster')

      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [39.4, -8.2],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Cluster com ícone personalizado (verde da marca)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        disableClusteringAtZoom: 13,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) => {
          const n = c.getChildCount()
          return L.divIcon({
            html: `
              <div style="
                background:rgba(22,163,74,.18);border-radius:50%;
                width:40px;height:40px;
                display:flex;align-items:center;justify-content:center;">
                <div style="
                  background:#16a34a;color:#fff;font-weight:700;font-size:13px;
                  border-radius:50%;width:28px;height:28px;
                  display:flex;align-items:center;justify-content:center;
                  font-family:Inter,system-ui,sans-serif;">${n}</div>
              </div>`,
            className: '',
            iconSize:   [40, 40],
            iconAnchor: [20, 20],
          })
        },
      })

      cluster.addTo(map)
      clusterRef.current = cluster
      mapRef.current     = map
      initialised.current = true

      // Renderiza os pins iniciais
      renderPinsWithL(L, spots, selectedSpotId, onSpotSelect, cluster)
    }

    init().catch(console.error)
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        initialised.current = false
      }
    }
    // Só corre uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Actualiza pins quando spots ou seleção mudam ─────
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    import('leaflet').then(({ default: L }) => {
      renderPinsWithL(L, spots, selectedSpotId, onSpotSelect, clusterRef.current)
    })
  }, [spots, selectedSpotId, onSpotSelect])

  // ── Centra no spot selecionado ───────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedSpotId) return
    const spot = spots.find(s => s.id === selectedSpotId)
    if (spot) {
      mapRef.current.setView([spot.lat, spot.lng], 14, { animate: true, duration: 0.4 })
    }
  }, [selectedSpotId, spots])

  // ── Marker da posição do utilizador ─────────────────
  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return
    import('leaflet').then(({ default: L }) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      const icon = L.divIcon({
        html: `<div style="
          width:14px;height:14px;background:#2563eb;
          border:3px solid #fff;border-radius:50%;
          box-shadow:0 0 0 3px rgba(37,99,235,.25),0 2px 8px rgba(0,0,0,.3);"></div>`,
        className: '',
        iconAnchor: [7, 7],
        iconSize:   [14, 14],
      })
      userMarkerRef.current = L.marker([userLat, userLng], { icon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindTooltip('A tua posição', { direction: 'top' })
      mapRef.current.setView([userLat, userLng], 10, { animate: true })
    })
  }, [userLat, userLng])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      aria-label="Mapa de spots de bouldering"
    />
  )
}

// ── Função auxiliar (fora do componente para não criar closures) ──

function renderPinsWithL(
  L: any,
  spots: SpotWithCondition[],
  selectedSpotId: string | null,
  onSpotSelect: (id: string) => void,
  cluster: any,
) {
  cluster.clearLayers()

  const COLORS: Record<string, string> = {
    good: '#16a34a',
    ok:   '#d97706',
    bad:  '#dc2626',
  }

  spots.forEach(spot => {
    const status   = spot.condition?.status ?? 'ok'
    const selected = spot.id === selectedSpotId
    const size     = selected ? 26 : 20
    const color    = COLORS[status] ?? COLORS.ok
    const ring     = selected ? `box-shadow:0 0 0 3px rgba(37,99,235,.4),0 2px 8px rgba(0,0,0,.25)` : `box-shadow:0 2px 6px rgba(0,0,0,.25)`

    const icon = L.divIcon({
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:${selected ? '3px solid #2563eb' : '2.5px solid #fff'};
        border-radius:50%;
        ${ring};
        cursor:pointer;
        transition:transform .15s;">
      </div>`,
      className: '',
      iconAnchor: [size / 2, size / 2],
      iconSize:   [size, size],
    })

    const marker = L.marker([spot.lat, spot.lng], { icon })
      .on('click', () => onSpotSelect(spot.id))

    marker.bindTooltip(spot.name, {
      permanent: false,
      direction: 'top',
      offset:    [0, -(size / 2) - 4],
    })

    cluster.addLayer(marker)
  })
}
