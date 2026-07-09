'use client'

import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TyphoonData } from '@/types'
import { getCategoryColor } from '@/lib/utils'

interface TyphoonMapProps {
  typhoons: TyphoonData[]
  center?: [number, number]
  zoom?: number
  onTyphoonClick?: (typhoon: TyphoonData) => void
  className?: string
}

// 免费底图源
const TILE_SOURCES = {
  osm: {
    name: 'OSM Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  carto_light: {
    name: 'Carto Light',
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; CartoDB',
  },
  carto_dark: {
    name: 'Carto Dark',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; CartoDB',
  },
  opentopo: {
    name: 'OpenTopoMap',
    url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
}

export function TyphoonMap({
  typhoons,
  center = [130, 20],
  zoom = 3,
  onTyphoonClick,
  className = '',
}: TyphoonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [currentTile, setCurrentTile] = useState('carto_dark')

  useEffect(() => {
    if (!mapContainer.current) return

    const tileSource = TILE_SOURCES[currentTile as keyof typeof TILE_SOURCES]

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [tileSource.url.replace('{z}/{x}/{y}', '{z}/{x}/{y}')],
            tileSize: 256,
            attribution: tileSource.attribution,
          },
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: center,
      zoom: zoom,
      minZoom: 2,
      maxZoom: 18,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    map.current.on('load', () => {
      setLoaded(true)
    })

    return () => {
      map.current?.remove()
    }
  }, [currentTile])

  useEffect(() => {
    if (!map.current || !loaded) return

    // 清除现有标记
    const existingMarkers = document.querySelectorAll('.typhoon-marker')
    existingMarkers.forEach((marker) => marker.remove())

    // 清除现有路径
    const layers = map.current.getStyle().layers || []
    layers.forEach((layer) => {
      if (layer.id.startsWith('typhoon-')) {
        map.current?.removeLayer(layer.id)
      }
    })

    const sources = map.current.getStyle().sources || {}
    Object.keys(sources).forEach((key) => {
      if (key.startsWith('typhoon-')) {
        map.current?.removeSource(key)
      }
    })

    // 添加台风标记和路径
    typhoons.forEach((typhoon) => {
      if (!map.current) return

      // 创建台风标记
      const markerEl = document.createElement('div')
      markerEl.className = 'typhoon-marker'
      markerEl.style.width = '40px'
      markerEl.style.height = '40px'
      markerEl.style.position = 'relative'
      markerEl.style.cursor = 'pointer'

      const icon = document.createElement('div')
      icon.style.width = '100%'
      icon.style.height = '100%'
      icon.style.borderRadius = '50%'
      icon.style.backgroundColor = getCategoryColor(typhoon.category)
      icon.style.opacity = '0.9'
      icon.style.display = 'flex'
      icon.style.alignItems = 'center'
      icon.style.justifyContent = 'center'
      icon.style.boxShadow = `0 0 20px ${getCategoryColor(typhoon.category)}`
      icon.style.border = '2px solid white'
      icon.innerHTML = '🌀'
      icon.style.fontSize = '20px'
      markerEl.appendChild(icon)

      // 点击事件
      markerEl.addEventListener('click', () => {
        onTyphoonClick?.(typhoon)
      })

      // 添加标记
      new maplibregl.Marker(markerEl)
        .setLngLat([typhoon.currentLng, typhoon.currentLat])
        .addTo(map.current)

      // 添加信息弹窗
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: 'typhoon-popup',
      }).setHTML(`
        <div style="padding: 12px; min-width: 220px; background: #1e293b; color: white; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${getCategoryColor(typhoon.category)}">
            🌀 ${typhoon.name} ${typhoon.nameCn ? `(${typhoon.nameCn})` : ''}
          </h3>
          <p style="margin: 4px 0; font-size: 13px;">📍 ${typhoon.currentLat.toFixed(1)}°N, ${typhoon.currentLng.toFixed(1)}°E</p>
          <p style="margin: 4px 0; font-size: 13px;">💨 最大风速: ${typhoon.maxWindSpeed} knots</p>
          <p style="margin: 4px 0; font-size: 13px;">🔽 最低气压: ${typhoon.minPressure} hPa</p>
          <p style="margin: 4px 0; font-size: 13px;">📊 强度: ${getCategoryName(typhoon.category)}</p>
        </div>
      `)

      markerEl.addEventListener('mouseenter', () => {
        popup.setLngLat([typhoon.currentLng, typhoon.currentLat]).addTo(map.current!)
      })

      markerEl.addEventListener('mouseleave', () => {
        popup.remove()
      })

      // 添加历史路径
      if (typhoon.positions && typhoon.positions.length > 1) {
        const coordinates = typhoon.positions.map((pos) => [pos.longitude, pos.latitude] as [number, number])
        const sourceId = `typhoon-path-${typhoon.id}`

        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        })

        map.current.addLayer({
          id: `typhoon-path-line-${typhoon.id}`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': getCategoryColor(typhoon.category),
            'line-width': 3,
            'line-opacity': 0.8,
          },
        })

        // 添加路径点
        typhoon.positions.forEach((pos, index) => {
          const dotEl = document.createElement('div')
          dotEl.style.width = '6px'
          dotEl.style.height = '6px'
          dotEl.style.borderRadius = '50%'
          dotEl.style.backgroundColor = getCategoryColor(pos.category)
          dotEl.style.opacity = index === typhoon.positions!.length - 1 ? '1' : '0.5'

          new maplibregl.Marker(dotEl)
            .setLngLat([pos.longitude, pos.latitude])
            .addTo(map.current!)
        })
      }
    })
  }, [typhoons, loaded, onTyphoonClick])

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* 底图切换 */}
      <div className="absolute top-2 left-2 z-10 bg-slate-800/90 rounded-lg p-2 flex gap-1">
        {Object.entries(TILE_SOURCES).map(([key, source]) => (
          <button
            key={key}
            onClick={() => setCurrentTile(key)}
            className={`px-2 py-1 text-xs rounded ${
              currentTile === key
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {source.name}
          </button>
        ))}
      </div>

      <style jsx global>{`
        .typhoon-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
        .typhoon-popup .maplibregl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    TROPICAL_DEPRESSION: '热带低压',
    TROPICAL_STORM: '热带风暴',
    SEVERE_TROPICAL_STORM: '强热带风暴',
    TYPHOON: '台风',
    SEVERE_TYPHOON: '强台风',
    SUPER_TYPHOON: '超强台风',
  }
  return names[category] || category
}
