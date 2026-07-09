'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TyphoonData, TyphoonPosition } from '@/types'
import { getCategoryColor, getCategoryName, formatWindSpeed, formatPressure } from '@/lib/utils'

interface TyphoonMapProps {
  typhoons: TyphoonData[]
  center?: [number, number]
  zoom?: number
  onTyphoonClick?: (typhoon: TyphoonData) => void
  className?: string
}

// 底图源
const TILE_SOURCES = {
  osm: { name: 'OSM', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', bg: '#e8e4d8' },
  carto_light: { name: 'Light', url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', bg: '#f8f4f0' },
  carto_dark: { name: 'Dark', url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', bg: '#1a1a2e' },
  opentopo: { name: 'Topo', url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png', bg: '#e8e4d8' },
}

// 图层配置
const LAYERS = [
  { id: 'wind', name: '风速', icon: '💨', unit: 'knots', color: '#3b82f6' },
  { id: 'pressure', name: '气压', icon: '🔽', unit: 'hPa', color: '#ef4444' },
  { id: 'rain', name: '降雨', icon: '🌧️', unit: 'mm', color: '#22c55e' },
  { id: 'temp', name: '温度', icon: '🌡️', unit: '°C', color: '#f59e0b' },
  { id: 'wave', name: '海浪', icon: '🌊', unit: 'm', color: '#06b6d4' },
]

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
  const [activeLayer, setActiveLayer] = useState('wind')
  const [selectedTyphoon, setSelectedTyphoon] = useState<TyphoonData | null>(null)
  const [forecastHour, setForecastHour] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number } | null>(null)
  const [mapZoom, setMapZoom] = useState(zoom)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化地图
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
            tiles: [tileSource.url],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 22,
        }],
      },
      center: center,
      zoom: zoom,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    })

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right')

    map.current.on('load', () => setLoaded(true))
    map.current.on('zoom', () => setMapZoom(map.current?.getZoom() || zoom))

    // 鼠标移动获取坐标
    map.current.on('mousemove', (e) => {
      setCursorPos({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })

    map.current.on('mouseleave', () => setCursorPos(null))

    return () => { map.current?.remove() }
  }, [currentTile])

  // 更新台风数据
  useEffect(() => {
    if (!map.current || !loaded) return
    updateTyphoonLayers()
  }, [typhoons, loaded, forecastHour])

  // 更新地图图层
  const updateTyphoonLayers = useCallback(() => {
    if (!map.current) return

    // 清除现有标记
    document.querySelectorAll('.ev-marker, .ev-dot, .ev-label').forEach(el => el.remove())

    // 清除图层
    const style = map.current.getStyle()
    ;(style.layers || []).forEach(l => {
      if (l.id.startsWith('ev-')) try { map.current?.removeLayer(l.id) } catch {}
    })
    Object.keys(style.sources || {}).forEach(s => {
      if (s.startsWith('ev-')) try { map.current?.removeSource(s) } catch {}
    })

    // 添加警戒线
    addWarningLines(map.current)

    // 添加台风
    typhoons.forEach(typhoon => {
      if (!map.current) return
      addTyphoonToMap(map.current, typhoon)
    })
  }, [typhoons, forecastHour])

  // 添加警戒线
  const addWarningLines = (map: maplibregl.Map) => {
    const lines = [
      { id: '24h', color: '#ef4444', coords: [[105,5],[110,8],[115,12],[118,15],[120,18],[122,20],[125,22],[128,24],[130,26],[132,28],[135,30],[140,32],[145,35]] },
      { id: '48h', color: '#f59e0b', coords: [[100,0],[105,3],[110,6],[115,10],[118,13],[120,16],[123,18],[126,20],[130,22],[135,25],[140,28],[145,30],[150,33]] },
    ]

    lines.forEach(line => {
      map.addSource(`ev-warning-${line.id}`, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line.coords } },
      })
      map.addLayer({
        id: `ev-warning-${line.id}`,
        type: 'line',
        source: `ev-warning-${line.id}`,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': line.color, 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [6, 3] },
      })
      // 标签
      const mid = line.coords[Math.floor(line.coords.length / 2)] as [number, number]
      addLabel(map, mid, `${line.id}警戒`, line.color)
    })
  }

  // 添加标签
  const addLabel = (map: maplibregl.Map, pos: [number, number], text: string, color: string) => {
    const el = document.createElement('div')
    el.className = 'ev-label'
    el.style.cssText = `background:rgba(15,23,42,0.9);color:${color};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid ${color};pointer-events:none;white-space:nowrap;`
    el.textContent = text
    new maplibregl.Marker({ element: el }).setLngLat(pos).addTo(map)
  }

  // 添加台风到地图
  const addTyphoonToMap = (map: maplibregl.Map, typhoon: TyphoonData) => {
    // 历史路径
    const historyPoints = typhoon.positions?.filter(p => (p.forecastHour ?? 0) <= 0) || []
    if (historyPoints.length > 1) {
      const coords = historyPoints.map(p => [p.longitude, p.latitude] as [number, number])
      map.addSource(`ev-history-${typhoon.id}`, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      })
      map.addLayer({
        id: `ev-history-${typhoon.id}`,
        type: 'line',
        source: `ev-history-${typhoon.id}`,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#60a5fa', 'line-width': 3, 'line-opacity': 0.9 },
      })
    }

    // 预报路径
    const forecastPoints = typhoon.positions?.filter(p => (p.forecastHour ?? 0) >= 0) || []
    if (forecastPoints.length > 1) {
      const coords = forecastPoints.map(p => [p.longitude, p.latitude] as [number, number])
      map.addSource(`ev-forecast-${typhoon.id}`, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      })
      map.addLayer({
        id: `ev-forecast-${typhoon.id}`,
        type: 'line',
        source: `ev-forecast-${typhoon.id}`,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f87171', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [4, 4] },
      })
    }

    // 路径点
    typhoon.positions?.forEach(pos => {
      const el = document.createElement('div')
      el.className = 'ev-dot'
      el.style.cssText = `width:6px;height:6px;border-radius:50%;background:${getCategoryColor(pos.category)};border:1px solid rgba(255,255,255,0.5);opacity:${(pos.forecastHour ?? 0) <= 0 ? 0.8 : 0.5};cursor:pointer;`
      new maplibregl.Marker({ element: el }).setLngLat([pos.longitude, pos.latitude]).addTo(map)
    })

    // 实时位置标记
    const currentEl = document.createElement('div')
    currentEl.className = 'ev-marker'
    currentEl.style.cssText = 'position:relative;width:40px;height:40px;cursor:pointer;'

    // 内圆
    const inner = document.createElement('div')
    inner.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:${getCategoryColor(typhoon.category)};border:3px solid white;box-shadow:0 0 15px ${getCategoryColor(typhoon.category)};z-index:2;`
    currentEl.appendChild(inner)

    // 脉冲动画
    const pulse = document.createElement('div')
    pulse.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;border:2px solid ${getCategoryColor(typhoon.category)};animation:ev-pulse 2s ease-out infinite;z-index:1;`
    currentEl.appendChild(pulse)

    // 风圈指示
    if (typhoon.radius15knots) {
      const r = Math.min(typhoon.radius15knots / 10, 30)
      const circle = document.createElement('div')
      circle.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${r*2}px;height:${r*2}px;border-radius:50%;border:1px solid ${getCategoryColor(typhoon.category)}40;background:${getCategoryColor(typhoon.category)}10;z-index:0;`
      currentEl.appendChild(circle)
    }

    // 点击事件
    currentEl.addEventListener('click', () => {
      setSelectedTyphoon(typhoon)
      onTyphoonClick?.(typhoon)
    })

    // 弹窗
    const popup = new maplibregl.Popup({
      closeButton: false, closeOnClick: false, offset: 25, className: 'ev-popup',
    }).setHTML(`
      <div style="padding:14px;min-width:220px;background:#0f172a;color:white;border-radius:10px;border:1px solid #334155;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:14px;height:14px;border-radius:50%;background:${getCategoryColor(typhoon.category)};box-shadow:0 0 10px ${getCategoryColor(typhoon.category)};"></div>
          <div>
            <div style="font-weight:bold;font-size:15px;">${typhoon.name}</div>
            <div style="font-size:11px;color:#94a3b8;">${typhoon.nameCn || ''} ${typhoon.internationalId || ''}</div>
          </div>
          <div style="margin-left:auto;background:${getCategoryColor(typhoon.category)};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">
            ${getCategoryName(typhoon.category)}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
          <div style="background:#1e293b;padding:8px;border-radius:6px;">
            <div style="color:#94a3b8;font-size:10px;">位置</div>
            <div style="font-weight:600;">${typhoon.currentLat.toFixed(1)}°N, ${typhoon.currentLng.toFixed(1)}°E</div>
          </div>
          <div style="background:#1e293b;padding:8px;border-radius:6px;">
            <div style="color:#94a3b8;font-size:10px;">风速</div>
            <div style="font-weight:600;color:#3b82f6;">${typhoon.maxWindSpeed} kt</div>
          </div>
          <div style="background:#1e293b;padding:8px;border-radius:6px;">
            <div style="color:#94a3b8;font-size:10px;">气压</div>
            <div style="font-weight:600;color:#ef4444;">${typhoon.minPressure} hPa</div>
          </div>
          <div style="background:#1e293b;padding:8px;border-radius:6px;">
            <div style="color:#94a3b8;font-size:10px;">移动</div>
            <div style="font-weight:600;">${typhoon.movementDir || '-'} ${typhoon.movementSpeed || '-'} kt</div>
          </div>
        </div>
      </div>
    `)

    currentEl.addEventListener('mouseenter', () => popup.setLngLat([typhoon.currentLng, typhoon.currentLat]).addTo(map))
    currentEl.addEventListener('mouseleave', () => popup.remove())

    new maplibregl.Marker({ element: currentEl, anchor: 'center' })
      .setLngLat([typhoon.currentLng, typhoon.currentLat])
      .addTo(map)

    // 名称标签
    const label = document.createElement('div')
    label.className = 'ev-label'
    label.style.cssText = `background:rgba(15,23,42,0.85);color:${getCategoryColor(typhoon.category)};padding:3px 8px;border-radius:6px;font-size:12px;font-weight:bold;border:1px solid ${getCategoryColor(typhoon.category)};pointer-events:none;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);`
    label.innerHTML = `🌀 ${typhoon.name}`
    new maplibregl.Marker({ element: label, anchor: 'bottom', offset: [0, -25] })
      .setLngLat([typhoon.currentLng, typhoon.currentLat])
      .addTo(map)
  }

  // 时间轴播放
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setForecastHour(prev => prev >= 120 ? 0 : prev + 6)
      }, 1000)
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current) }
  }, [isPlaying])

  // 获取当前时间点的数据
  const getCurrentData = () => {
    if (!selectedTyphoon?.positions) return null
    return selectedTyphoon.positions.find(p => (p.forecastHour ?? 0) === forecastHour) || selectedTyphoon.positions[0]
  }

  const currentData = getCurrentData()

  return (
    <div className={`relative bg-[#0f172a] ${className}`}>
      {/* 地图容器 */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-slate-900/95 to-transparent pointer-events-none">
        <div className="flex items-center justify-between p-3 pointer-events-auto">
          {/* 左侧：底图切换 */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 flex gap-1 border border-slate-700">
              {Object.entries(TILE_SOURCES).map(([key, source]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTile(key)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                    currentTile === key
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：坐标显示 */}
          {cursorPos && (
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700 font-mono">
              {cursorPos.lat.toFixed(3)}°N, {cursorPos.lng.toFixed(3)}°E | Zoom: {mapZoom.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* 左侧面板 - 图层选择 */}
      <div className="absolute left-3 top-20 z-20">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="text-xs text-slate-400 font-medium">图层</div>
          </div>
          {LAYERS.map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                activeLayer === layer.id
                  ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span>{layer.icon}</span>
              <span>{layer.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧信息面板 */}
      {selectedTyphoon && (
        <div className={`absolute right-3 top-20 z-20 w-72 transition-all duration-300 ${showPanel ? 'translate-x-0' : 'translate-x-80'}`}>
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            {/* 面板头部 */}
            <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: getCategoryColor(selectedTyphoon.category) }}>
                    🌀
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{selectedTyphoon.name}</div>
                    <div className="text-slate-400 text-xs">{selectedTyphoon.nameCn} | {selectedTyphoon.internationalId}</div>
                  </div>
                </div>
                <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 数据网格 */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <DataCard label="风速" value={`${selectedTyphoon.maxWindSpeed} kt`} sub={`${Math.round(selectedTyphoon.maxWindSpeed * 1.852)} km/h`} color="#3b82f6" />
              <DataCard label="气压" value={`${selectedTyphoon.minPressure} hPa`} sub={selectedTyphoon.minPressure < 950 ? '超强' : '强'} color="#ef4444" />
              <DataCard label="位置" value={`${selectedTyphoon.currentLat.toFixed(1)}°N`} sub={`${selectedTyphoon.currentLng.toFixed(1)}°E`} color="#22c55e" />
              <DataCard label="移动" value={selectedTyphoon.movementDir || '-'} sub={`${selectedTyphoon.movementSpeed || '-'} kt`} color="#f59e0b" />
            </div>

            {/* 风圈 */}
            <div className="px-4 pb-4">
              <div className="text-xs text-slate-400 mb-2">风圈半径</div>
              <div className="space-y-2">
                {selectedTyphoon.radius15knots && <RadiusBar label="7级" value={selectedTyphoon.radius15knots} max={400} color="#3b82f6" />}
                {selectedTyphoon.radius30knots && <RadiusBar label="10级" value={selectedTyphoon.radius30knots} max={200} color="#f59e0b" />}
                {selectedTyphoon.radius50knots && <RadiusBar label="12级" value={selectedTyphoon.radius50knots} max={100} color="#ef4444" />}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4 border-t border-slate-700 flex gap-2">
              <button
                onClick={() => onTyphoonClick?.(selectedTyphoon)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                详细分析
              </button>
              <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                📤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部时间轴 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-900/95 to-transparent pointer-events-none">
        <div className="p-4 pointer-events-auto">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-4">
              {/* 播放按钮 */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors shadow-lg shadow-blue-500/30"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* 时间轴 */}
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>历史</span>
                  <span className="text-white font-medium">
                    {forecastHour === 0 ? '当前' : `+${forecastHour}h`}
                  </span>
                  <span>预报</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={6}
                  value={forecastHour}
                  onChange={(e) => setForecastHour(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-1">
                  {[0, 24, 48, 72, 96, 120].map(h => (
                    <button
                      key={h}
                      onClick={() => setForecastHour(h)}
                      className={`text-xs px-1 ${forecastHour === h ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                    >
                      {h === 0 ? '现在' : `+${h}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 当前数据 */}
              {currentData && (
                <div className="flex gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-slate-400">风速</div>
                    <div className="text-blue-400 font-bold">{Math.round(currentData.windSpeed)} kt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400">气压</div>
                    <div className="text-red-400 font-bold">{Math.round(currentData.pressure)} hPa</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 展开面板按钮 */}
      {selectedTyphoon && !showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute right-3 top-20 z-10 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700 text-white hover:bg-slate-700"
        >
          ◀
        </button>
      )}

      {/* CSS动画 */}
      <style jsx global>{`
        @keyframes ev-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        .ev-popup .maplibregl-popup-content { background: transparent !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        .ev-popup .maplibregl-popup-tip { display: none !important; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: #3b82f6; cursor: pointer;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #3b82f6; cursor: pointer; border: none;
        }
      `}</style>
    </div>
  )
}

// 数据卡片组件
function DataCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-slate-900/80 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  )
}

// 风圈进度条
function RadiusBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-slate-400 w-8">{label}</div>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value / max * 100, 100)}%`, background: color }} />
      </div>
      <div className="text-xs text-slate-300 w-16 text-right">{value} km</div>
    </div>
  )
}
