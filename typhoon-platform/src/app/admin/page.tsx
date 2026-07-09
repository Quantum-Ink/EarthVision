'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TyphoonData, TyphoonPosition } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'
import { getCategoryColor, getCategoryName, formatWindSpeed, formatPressure } from '@/lib/utils'

// 图层配置
const LAYER_CONFIG = [
  { id: 'current', name: '当前台风', icon: '🌀', checked: true },
  { id: 'history', name: '历史路径', icon: '📍', checked: true },
  { id: 'forecast', name: '预测路径', icon: '📈', checked: true },
  { id: 'ai_path', name: 'AI融合路径', icon: '🤖', checked: true },
  { id: 'cone', name: '概率锥', icon: '🎯', checked: true },
  { id: 'wind_circle', name: '风圈', icon: '💨', checked: true },
  { id: 'sst', name: '海温', icon: '🌊', checked: false },
  { id: 'wind_field', name: '风场', icon: '🌬️', checked: false },
  { id: 'pressure', name: '气压场', icon: '🔽', checked: false },
  { id: 'rain', name: '降雨', icon: '🌧️', checked: false },
  { id: 'cloud', name: '云图', icon: '☁️', checked: false },
  { id: 'city_impact', name: '城市影响', icon: '🏙️', checked: true },
  { id: 'risk_zone', name: '风险区域', icon: '⚠️', checked: true },
]

// 机构颜色
const AGENCY_COLORS: Record<string, string> = {
  JTWC: '#3b82f6',
  CMA: '#ef4444',
  JMA: '#22c55e',
  NOAA: '#f59e0b',
  ECMWF: '#8b5cf6',
  HKO: '#06b6d4',
  AI: '#ffffff',
}

export default function AdminPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [typhoons, setTyphoons] = useState<TyphoonData[]>([])
  const [selectedTyphoon, setSelectedTyphoon] = useState<TyphoonData | null>(null)
  const [layers, setLayers] = useState(LAYER_CONFIG)
  const [forecastHour, setForecastHour] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number } | null>(null)
  const [mapZoom, setMapZoom] = useState(3)
  const playRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化
  useEffect(() => {
    const data = generateMockTyphoonData()
    setTyphoons(data)
    if (data.length > 0) setSelectedTyphoon(data[0])
  }, [])

  // 时钟
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          tiles: {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'base', type: 'raster', source: 'tiles' }],
      },
      center: [130, 20],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.current.on('load', () => setLoaded(true))
    map.current.on('zoom', () => setMapZoom(map.current?.getZoom() || 3))
    map.current.on('mousemove', (e) => setCursorPos({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    map.current.on('mouseleave', () => setCursorPos(null))

    return () => { map.current?.remove() }
  }, [])

  // 更新地图数据
  useEffect(() => {
    if (!map.current || !loaded) return
    updateMap()
  }, [typhoons, loaded, layers, forecastHour])

  // 更新地图
  const updateMap = useCallback(() => {
    if (!map.current) return

    // 清除
    document.querySelectorAll('.ev-m').forEach(el => el.remove())
    const style = map.current.getStyle()
    ;(style.layers || []).forEach(l => {
      if (l.id.startsWith('ev-')) try { map.current?.removeLayer(l.id) } catch {}
    })
    Object.keys(style.sources || {}).forEach(s => {
      if (s.startsWith('ev-')) try { map.current?.removeSource(s) } catch {}
    })

    const layerIds = new Set(layers.filter(l => l.checked).map(l => l.id))

    // 添加警戒线
    if (layerIds.has('risk_zone')) {
      addWarningLines(map.current)
    }

    // 添加台风
    typhoons.forEach(ty => {
      if (!map.current) return

      // 历史路径
      if (layerIds.has('history')) {
        const history = ty.positions?.filter(p => (p.forecastHour ?? 0) <= 0) || []
        if (history.length > 1) {
          addPath(map.current, `ev-hist-${ty.id}`, history.map(p => [p.longitude, p.latitude]), '#60a5fa', 3, false)
        }
      }

      // 预测路径
      if (layerIds.has('forecast')) {
        const forecast = ty.positions?.filter(p => (p.forecastHour ?? 0) >= 0) || []
        if (forecast.length > 1) {
          addPath(map.current, `ev-fc-${ty.id}`, forecast.map(p => [p.longitude, p.latitude]), '#f87171', 2, true)
        }
      }

      // AI路径
      if (layerIds.has('ai_path')) {
        const aiPoints = ty.positions?.filter(p => (p.forecastHour ?? 0) >= 0) || []
        if (aiPoints.length > 1) {
          const offset = aiPoints.map(p => [p.longitude + 0.3, p.latitude + 0.2])
          addPath(map.current, `ev-ai-${ty.id}`, offset, '#ffffff', 3, false)
        }
      }

      // 概率锥
      if (layerIds.has('cone')) {
        addProbabilityCone(map.current, ty)
      }

      // 路径点
      ty.positions?.forEach(pos => {
        const el = document.createElement('div')
        el.className = 'ev-m'
        el.style.cssText = `width:5px;height:5px;border-radius:50%;background:${getCategoryColor(pos.category)};opacity:${(pos.forecastHour ?? 0) <= 0 ? 0.8 : 0.4};`
        new maplibregl.Marker({ element: el }).setLngLat([pos.longitude, pos.latitude]).addTo(map.current!)
      })

      // 当前位置
      if (layerIds.has('current')) {
        addCurrentMarker(map.current, ty)
      }
    })
  }, [typhoons, layers, forecastHour])

  // 添加路径
  const addPath = (map: maplibregl.Map, id: string, coords: number[][], color: string, width: number, dashed: boolean) => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    })
    map.addLayer({
      id: `${id}-line`,
      type: 'line',
      source: id,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': width,
        'line-opacity': 0.8,
        ...(dashed ? { 'line-dasharray': [4, 4] } : {}),
      },
    })
  }

  // 添加警戒线
  const addWarningLines = (map: maplibregl.Map) => {
    const lines = [
      { id: '24h', color: '#ef4444', coords: [[105,5],[110,8],[115,12],[118,15],[120,18],[122,20],[125,22],[128,24],[130,26],[132,28],[135,30],[140,32],[145,35]] },
      { id: '48h', color: '#f59e0b', coords: [[100,0],[105,3],[110,6],[115,10],[118,13],[120,16],[123,18],[126,20],[130,22],[135,25],[140,28],[145,30],[150,33]] },
    ]
    lines.forEach(l => {
      addPath(map, `ev-warn-${l.id}`, l.coords, l.color, 2, true)
      const mid = l.coords[Math.floor(l.coords.length / 2)]
      addLabel(map, mid as [number, number], `${l.id}警戒`, l.color)
    })
  }

  // 添加概率锥
  const addProbabilityCone = (map: maplibregl.Map, ty: TyphoonData) => {
    const forecast = ty.positions?.filter(p => (p.forecastHour ?? 0) >= 0) || []
    if (forecast.length < 2) return

    const coords50: [number, number][] = []
    const coords90: [number, number][] = []

    forecast.forEach((p, i) => {
      const spread = (p.forecastHour ?? 0) / 24 * 0.5
      coords50.push([p.longitude + spread * 0.5, p.latitude + spread * 0.3])
      coords90.push([p.longitude + spread * 1.5, p.latitude + spread * 1.0])
    })

    const coords50Rev = [...forecast].reverse().map(p => {
      const spread = (p.forecastHour ?? 0) / 24 * 0.5
      return [p.longitude - spread * 0.5, p.latitude - spread * 0.3] as [number, number]
    })

    const coords90Rev = [...forecast].reverse().map(p => {
      const spread = (p.forecastHour ?? 0) / 24 * 0.5
      return [p.longitude - spread * 1.5, p.latitude - spread * 1.0] as [number, number]
    })

    // 50%锥
    map.addSource(`ev-cone50-${ty.id}`, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...coords50, ...coords50Rev, coords50[0]]] } },
    })
    map.addLayer({
      id: `ev-cone50-${ty.id}`,
      type: 'fill',
      source: `ev-cone50-${ty.id}`,
      paint: { 'fill-color': getCategoryColor(ty.category), 'fill-opacity': 0.15 },
    })

    // 90%锥
    map.addSource(`ev-cone90-${ty.id}`, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...coords90, ...coords90Rev, coords90[0]]] } },
    })
    map.addLayer({
      id: `ev-cone90-${ty.id}`,
      type: 'fill',
      source: `ev-cone90-${ty.id}`,
      paint: { 'fill-color': getCategoryColor(ty.category), 'fill-opacity': 0.08 },
    })
  }

  // 添加当前位置标记
  const addCurrentMarker = (map: maplibregl.Map, ty: TyphoonData) => {
    const el = document.createElement('div')
    el.className = 'ev-m'
    el.style.cssText = 'position:relative;width:44px;height:44px;cursor:pointer;'

    const inner = document.createElement('div')
    inner.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:${getCategoryColor(ty.category)};border:3px solid white;box-shadow:0 0 20px ${getCategoryColor(ty.category)};z-index:2;`
    el.appendChild(inner)

    const pulse = document.createElement('div')
    pulse.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;border:2px solid ${getCategoryColor(ty.category)};animation:ev-pulse 2s ease-out infinite;z-index:1;`
    el.appendChild(pulse)

    el.addEventListener('click', () => setSelectedTyphoon(ty))

    const popup = new maplibregl.Popup({
      closeButton: false, closeOnClick: false, offset: 25, className: 'ev-popup',
    }).setHTML(`
      <div style="padding:14px;min-width:220px;background:#0f172a;color:white;border-radius:10px;border:1px solid #334155;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:14px;height:14px;border-radius:50%;background:${getCategoryColor(ty.category)};box-shadow:0 0 10px ${getCategoryColor(ty.category)};"></div>
          <div><div style="font-weight:bold;">${ty.name}</div><div style="font-size:11px;color:#94a3b8;">${ty.nameCn || ''}</div></div>
          <div style="margin-left:auto;background:${getCategoryColor(ty.category)};padding:2px 8px;border-radius:4px;font-size:11px;">${getCategoryName(ty.category)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
          <div style="background:#1e293b;padding:6px;border-radius:6px;"><div style="color:#94a3b8;font-size:10px;">位置</div><div>${ty.currentLat.toFixed(1)}°N, ${ty.currentLng.toFixed(1)}°E</div></div>
          <div style="background:#1e293b;padding:6px;border-radius:6px;"><div style="color:#94a3b8;font-size:10px;">风速</div><div style="color:#3b82f6;">${ty.maxWindSpeed} kt</div></div>
          <div style="background:#1e293b;padding:6px;border-radius:6px;"><div style="color:#94a3b8;font-size:10px;">气压</div><div style="color:#ef4444;">${ty.minPressure} hPa</div></div>
          <div style="background:#1e293b;padding:6px;border-radius:6px;"><div style="color:#94a3b8;font-size:10px;">移动</div><div>${ty.movementDir || '-'} ${ty.movementSpeed || '-'} kt</div></div>
        </div>
      </div>
    `)

    el.addEventListener('mouseenter', () => popup.setLngLat([ty.currentLng, ty.currentLat]).addTo(map))
    el.addEventListener('mouseleave', () => popup.remove())

    new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([ty.currentLng, ty.currentLat]).addTo(map)

    // 名称标签
    const label = document.createElement('div')
    label.className = 'ev-m'
    label.style.cssText = `background:rgba(15,23,42,0.9);color:${getCategoryColor(ty.category)};padding:3px 8px;border-radius:6px;font-size:12px;font-weight:bold;border:1px solid ${getCategoryColor(ty.category)};pointer-events:none;white-space:nowrap;`
    label.innerHTML = `🌀 ${ty.name}`
    new maplibregl.Marker({ element: label, anchor: 'bottom', offset: [0, -28] }).setLngLat([ty.currentLng, ty.currentLat]).addTo(map)
  }

  // 添加标签
  const addLabel = (map: maplibregl.Map, pos: [number, number], text: string, color: string) => {
    const el = document.createElement('div')
    el.className = 'ev-m'
    el.style.cssText = `background:rgba(15,23,42,0.9);color:${color};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid ${color};pointer-events:none;`
    el.textContent = text
    new maplibregl.Marker({ element: el }).setLngLat(pos).addTo(map)
  }

  // 时间轴播放
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setForecastHour(prev => prev >= 120 ? 0 : prev + 6)
      }, 800)
    } else {
      if (playRef.current) clearInterval(playRef.current)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying])

  // 切换图层
  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, checked: !l.checked } : l))
  }

  // 获取当前时间点数据
  const getCurrentPosition = (): TyphoonPosition | null => {
    if (!selectedTyphoon?.positions) return null
    return selectedTyphoon.positions.find(p => (p.forecastHour ?? 0) === forecastHour) || selectedTyphoon.positions[0]
  }

  const currentPos = getCurrentPosition()

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] text-white overflow-hidden">
      {/* 顶部栏 */}
      <header className="h-12 bg-slate-900/95 border-b border-slate-700 flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">🌀</div>
            <div>
              <div className="text-sm font-bold">EarthVision</div>
              <div className="text-[10px] text-slate-400">AI台风态势分析控制中心</div>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>📡 数据源: 5个</span>
            <span>🔄 更新: {currentTime.toLocaleTimeString('zh-CN')}</span>
            <span className="text-green-400">● 系统正常</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-mono">
            {currentTime.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex items-center gap-1">
            {Object.entries(AGENCY_COLORS).filter(([k]) => k !== 'AI').map(([name, color]) => (
              <div key={name} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                {name}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧图层面板 */}
        <aside className="w-52 bg-slate-900/95 border-r border-slate-700 flex flex-col z-20 shrink-0">
          <div className="p-3 border-b border-slate-700">
            <div className="text-xs font-medium text-slate-400">图层控制</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {layers.map(layer => (
              <label
                key={layer.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  layer.checked ? 'bg-blue-500/10 text-white' : 'text-slate-500 hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layer.checked}
                  onChange={() => toggleLayer(layer.id)}
                  className="accent-blue-500"
                />
                <span className="text-sm">{layer.icon}</span>
                <span className="text-xs">{layer.name}</span>
              </label>
            ))}
          </div>
          <div className="p-3 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2">台风列表</div>
            <div className="space-y-1">
              {typhoons.map(ty => (
                <button
                  key={ty.id}
                  onClick={() => setSelectedTyphoon(ty)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    selectedTyphoon?.id === ty.id ? 'bg-blue-500/20 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: getCategoryColor(ty.category) }} />
                  <span className="font-medium">{ty.name}</span>
                  <span className="text-slate-500 ml-auto">{ty.maxWindSpeed}kt</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* 中央地图 */}
        <main className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* 坐标显示 */}
          {cursorPos && (
            <div className="absolute top-3 right-3 z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700 font-mono">
              {cursorPos.lat.toFixed(3)}°N, {cursorPos.lng.toFixed(3)}°E | Zoom: {mapZoom.toFixed(1)}
            </div>
          )}

          {/* 右侧分析面板 */}
          {selectedTyphoon && (
            <div className={`absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-700 z-20 flex flex-col transition-transform duration-300 ${showRightPanel ? 'translate-x-0' : 'translate-x-full'}`}>
              {/* 面板头部 */}
              <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: getCategoryColor(selectedTyphoon.category) }}>🌀</div>
                    <div>
                      <div className="font-bold text-lg">{selectedTyphoon.name}</div>
                      <div className="text-xs text-slate-400">{selectedTyphoon.nameCn} | {selectedTyphoon.internationalId}</div>
                    </div>
                  </div>
                  <button onClick={() => setShowRightPanel(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              </div>

              {/* 标签页 */}
              <div className="flex border-b border-slate-700">
                {[
                  { id: 'info', name: '信息' },
                  { id: 'ai', name: 'AI分析' },
                  { id: 'risk', name: '风险' },
                  { id: 'city', name: '城市' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* 面板内容 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'info' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <DataCard label="风速" value={`${selectedTyphoon.maxWindSpeed} kt`} sub={`${Math.round(selectedTyphoon.maxWindSpeed * 1.852)} km/h`} color="#3b82f6" />
                      <DataCard label="气压" value={`${selectedTyphoon.minPressure} hPa`} color="#ef4444" />
                      <DataCard label="位置" value={`${selectedTyphoon.currentLat.toFixed(1)}°N`} sub={`${selectedTyphoon.currentLng.toFixed(1)}°E`} color="#22c55e" />
                      <DataCard label="移动" value={selectedTyphoon.movementDir || '-'} sub={`${selectedTyphoon.movementSpeed || '-'} kt`} color="#f59e0b" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-2">风圈半径</div>
                      <div className="space-y-2">
                        {selectedTyphoon.radius15knots && <RadiusBar label="7级" value={selectedTyphoon.radius15knots} max={400} color="#3b82f6" />}
                        {selectedTyphoon.radius30knots && <RadiusBar label="10级" value={selectedTyphoon.radius30knots} max={200} color="#f59e0b" />}
                        {selectedTyphoon.radius50knots && <RadiusBar label="12级" value={selectedTyphoon.radius50knots} max={100} color="#ef4444" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-2">强度等级</div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ background: getCategoryColor(selectedTyphoon.category) }} />
                        <span className="font-medium">{getCategoryName(selectedTyphoon.category)}</span>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'ai' && (
                  <>
                    <div className="bg-slate-800 rounded-lg p-4">
                      <div className="text-xs text-slate-400 mb-2">🤖 AI分析摘要</div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        台风{selectedTyphoon.name}当前位于{selectedTyphoon.currentLat.toFixed(1)}°N, {selectedTyphoon.currentLng.toFixed(1)}°E，
                        最大风速{selectedTyphoon.maxWindSpeed} knots。预计将继续向{selectedTyphoon.movementDir || '西北'}方向移动。
                        {selectedTyphoon.maxWindSpeed >= 130 ? '强度已达超强台风级别，破坏力极强。' : '强度维持在较高水平。'}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-2">📊 路径预测</div>
                      <div className="space-y-2">
                        {[
                          { agency: 'JTWC', color: AGENCY_COLORS.JTWC, confidence: 85 },
                          { agency: 'CMA', color: AGENCY_COLORS.CMA, confidence: 80 },
                          { agency: 'JMA', color: AGENCY_COLORS.JMA, confidence: 82 },
                          { agency: 'AI融合', color: AGENCY_COLORS.AI, confidence: 90 },
                        ].map(item => (
                          <div key={item.agency} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                            <span className="text-xs flex-1">{item.agency}</span>
                            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${item.confidence}%`, background: item.color }} />
                            </div>
                            <span className="text-xs text-slate-400">{item.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-2">🎯 登陆概率</div>
                      <div className="space-y-2">
                        {[
                          { city: '温州', prob: 35 },
                          { city: '台州', prob: 25 },
                          { city: '福州', prob: 20 },
                        ].map(item => (
                          <div key={item.city} className="flex items-center gap-2">
                            <span className="text-xs w-12">{item.city}</span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.prob}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-10 text-right">{item.prob}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'risk' && (
                  <>
                    <div className="text-xs text-slate-400 mb-2">风险评分</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: '路径风险', score: 75, color: '#f59e0b' },
                        { name: '强度风险', score: 85, color: '#ef4444' },
                        { name: '登陆风险', score: 60, color: '#3b82f6' },
                        { name: '人口影响', score: 70, color: '#8b5cf6' },
                      ].map(risk => (
                        <div key={risk.name} className="bg-slate-800 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">{risk.name}</div>
                          <div className="text-2xl font-bold" style={{ color: risk.color }}>{risk.score}</div>
                          <div className="w-full h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${risk.score}%`, background: risk.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="text-xs text-red-400 font-medium mb-1">⚠️ 风险提示</div>
                      <p className="text-xs text-slate-300">台风强度大，沿海地区需做好防台风准备。建议相关地区启动应急预案。</p>
                    </div>
                  </>
                )}

                {activeTab === 'city' && (
                  <>
                    <div className="text-xs text-slate-400 mb-2">城市影响评估</div>
                    <div className="space-y-2">
                      {[
                        { city: '温州', dist: '120km', time: '24h', wind: '85kt', rain: '150mm', risk: 'high' },
                        { city: '台州', dist: '180km', time: '30h', wind: '65kt', rain: '120mm', risk: 'moderate' },
                        { city: '福州', dist: '250km', time: '36h', wind: '55kt', rain: '100mm', risk: 'moderate' },
                        { city: '宁波', dist: '300km', time: '42h', wind: '45kt', rain: '80mm', risk: 'low' },
                      ].map(city => (
                        <div key={city.city} className="bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{city.city}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              city.risk === 'high' ? 'bg-red-500/20 text-red-400' :
                              city.risk === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {city.risk === 'high' ? '高风险' : city.risk === 'moderate' ? '中风险' : '低风险'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                            <div>距离: {city.dist}</div>
                            <div>时间: {city.time}</div>
                            <div>风速: {city.wind}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 面板底部 */}
              <div className="p-3 border-t border-slate-700 flex gap-2">
                <button className="flex-1 bg-blue-500 hover:bg-blue-600 py-2 rounded-lg text-xs font-medium transition-colors">
                  📊 生成报告
                </button>
                <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors">
                  📤
                </button>
              </div>
            </div>
          )}

          {/* 展开面板按钮 */}
          {selectedTyphoon && !showRightPanel && (
            <button
              onClick={() => setShowRightPanel(true)}
              className="absolute right-3 top-3 z-10 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg border border-slate-700 text-white hover:bg-slate-700"
            >
              ◀
            </button>
          )}
        </main>
      </div>

      {/* 底部时间轴 */}
      <footer className="h-20 bg-slate-900/95 border-t border-slate-700 z-30 shrink-0">
        <div className="h-full flex items-center gap-4 px-4">
          {/* 播放控制 */}
          <div className="flex items-center gap-2">
            <button onClick={() => setForecastHour(0)} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs">⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => setForecastHour(120)} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs">⏭</button>
          </div>

          {/* 时间轴 */}
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>历史</span>
              <span className="text-white font-bold text-sm">
                {forecastHour === 0 ? '当前时刻' : `+${forecastHour}小时预报`}
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
              {[0, 6, 12, 24, 36, 48, 72, 96, 120].map(h => (
                <button
                  key={h}
                  onClick={() => setForecastHour(h)}
                  className={`text-[10px] px-1 transition-colors ${forecastHour === h ? 'text-blue-400 font-bold' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {h === 0 ? '现在' : `+${h}`}
                </button>
              ))}
            </div>
          </div>

          {/* 当前数据 */}
          {currentPos && (
            <div className="flex gap-4 text-xs bg-slate-800 rounded-lg px-4 py-2">
              <div className="text-center">
                <div className="text-slate-400">风速</div>
                <div className="text-blue-400 font-bold text-sm">{Math.round(currentPos.windSpeed)} kt</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">气压</div>
                <div className="text-red-400 font-bold text-sm">{Math.round(currentPos.pressure)} hPa</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">位置</div>
                <div className="text-green-400 font-bold text-sm">{currentPos.latitude.toFixed(1)}°N</div>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* CSS */}
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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  )
}

// 数据卡片
function DataCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

// 风圈进度条
function RadiusBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-slate-400 w-8">{label}</div>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(value / max * 100, 100)}%`, background: color }} />
      </div>
      <div className="text-xs text-slate-300 w-14 text-right">{value} km</div>
    </div>
  )
}
