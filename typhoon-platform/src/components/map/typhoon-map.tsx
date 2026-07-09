'use client'

import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { TyphoonData } from '@/types'
import { getCategoryColor } from '@/lib/utils'

interface TyphoonMapProps {
  typhoons: TyphoonData[]
  center?: [number, number]
  zoom?: number
  onTyphoonClick?: (typhoon: TyphoonData) => void
  className?: string
}

export function TyphoonMap({
  typhoons,
  center = [130, 20],
  zoom = 3,
  onTyphoonClick,
  className = '',
}: TyphoonMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: zoom,
      projection: 'globe',
    })

    map.current.on('load', () => {
      setLoaded(true)
      map.current?.setFog({
        color: 'rgb(15, 23, 42)',
        'high-color': 'rgb(30, 41, 59)',
        'horizon-blend': 0.1,
      })
    })

    return () => {
      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current || !loaded) return

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.typhoon-marker')
    existingMarkers.forEach((marker) => marker.remove())

    // Remove existing paths
    if (map.current.getLayer('typhoon-paths')) {
      map.current.removeLayer('typhoon-paths')
    }
    if (map.current.getSource('typhoon-paths')) {
      map.current.removeSource('typhoon-paths')
    }

    // Add typhoon markers and paths
    typhoons.forEach((typhoon) => {
      if (!map.current) return

      // Create marker element
      const markerEl = document.createElement('div')
      markerEl.className = 'typhoon-marker'
      markerEl.style.width = '40px'
      markerEl.style.height = '40px'
      markerEl.style.position = 'relative'
      markerEl.style.cursor = 'pointer'

      // Create typhoon icon
      const icon = document.createElement('div')
      icon.style.width = '100%'
      icon.style.height = '100%'
      icon.style.borderRadius = '50%'
      icon.style.backgroundColor = getCategoryColor(typhoon.category)
      icon.style.opacity = '0.8'
      icon.style.display = 'flex'
      icon.style.alignItems = 'center'
      icon.style.justifyContent = 'center'
      icon.style.boxShadow = `0 0 20px ${getCategoryColor(typhoon.category)}`
      icon.innerHTML = '🌀'
      icon.style.fontSize = '20px'

      markerEl.appendChild(icon)

      // Add click handler
      markerEl.addEventListener('click', () => {
        onTyphoonClick?.(typhoon)
      })

      // Add wind circles
      if (typhoon.radius50knots) {
        const circle50 = document.createElement('div')
        circle50.style.position = 'absolute'
        circle50.style.width = `${typhoon.radius50knots / 5}px`
        circle50.style.height = `${typhoon.radius50knots / 5}px`
        circle50.style.borderRadius = '50%'
        circle50.style.border = `2px solid ${getCategoryColor(typhoon.category)}`
        circle50.style.opacity = '0.3'
        circle50.style.top = '50%'
        circle50.style.left = '50%'
        circle50.style.transform = 'translate(-50%, -50%)'
        circle50.style.animation = 'pulse 2s infinite'
        markerEl.appendChild(circle50)
      }

      // Add marker to map
      new mapboxgl.Marker(markerEl)
        .setLngLat([typhoon.currentLng, typhoon.currentLat])
        .addTo(map.current)

      // Add path line
      if (typhoon.positions && typhoon.positions.length > 1) {
        const coordinates = typhoon.positions.map((pos) => [pos.longitude, pos.latitude] as [number, number])

        // Add source
        const sourceId = `typhoon-path-${typhoon.id}`
        if (!map.current.getSource(sourceId)) {
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

          // Add line layer
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

          // Add dots for each position
          typhoon.positions.forEach((pos, index) => {
            const dotEl = document.createElement('div')
            dotEl.style.width = '8px'
            dotEl.style.height = '8px'
            dotEl.style.borderRadius = '50%'
            dotEl.style.backgroundColor = getCategoryColor(pos.category)
            dotEl.style.opacity = index === typhoon.positions!.length - 1 ? '1' : '0.5'

            new mapboxgl.Marker(dotEl)
              .setLngLat([pos.longitude, pos.latitude])
              .addTo(map.current!)
          })
        }
      }

      // Add popup with info
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: 'typhoon-popup',
      }).setHTML(`
        <div style="padding: 10px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${getCategoryColor(typhoon.category)}">
            ${typhoon.name} ${typhoon.nameCn ? `(${typhoon.nameCn})` : ''}
          </h3>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>位置:</strong> ${typhoon.currentLat.toFixed(1)}°N, ${typhoon.currentLng.toFixed(1)}°E
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>最大风速:</strong> ${typhoon.maxWindSpeed} knots
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>最低气压:</strong> ${typhoon.minPressure} hPa
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>强度:</strong> ${getCategoryName(typhoon.category)}
          </p>
        </div>
      `)

      // Show popup on hover
      markerEl.addEventListener('mouseenter', () => {
        popup.setLngLat([typhoon.currentLng, typhoon.currentLat]).addTo(map.current!)
      })

      markerEl.addEventListener('mouseleave', () => {
        popup.remove()
      })
    })
  }, [typhoons, loaded, onTyphoonClick])

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
        }
        .typhoon-popup .mapboxgl-popup-content {
          background: rgba(15, 23, 42, 0.95);
          color: white;
          border: 1px solid rgba(100, 116, 139, 0.5);
          border-radius: 8px;
          padding: 0;
        }
        .typhoon-popup .mapboxgl-popup-tip {
          border-top-color: rgba(15, 23, 42, 0.95);
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
