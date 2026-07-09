import { FusedPoint } from '../data-fusion'
import { MonteCarloResult, ProbabilityCone } from '../probability'
import { AIAnalysisResult } from '../ai-analysis'

// 导出配置
export interface ExportConfig {
  format: 'PNG' | 'SVG' | 'PDF'
  width: number
  height: number
  dpi: number
  theme: 'light' | 'dark'
  layers: {
    historicalTrack: boolean
    forecastTrack: boolean
    aiTrack: boolean
    probabilityCones: boolean
    windCircles: boolean
    cities: boolean
    grid: boolean
    legend: boolean
    scaleBar: boolean
    compass: boolean
  }
  metadata: {
    title: string
    subtitle: string
    typhoonId: string
    typhoonName: string
    typhoonNameCn: string
    issuedAt: Date
    validUntil: Date
    source: string
    analyst: string
  }
}

// 导出结果
export interface ExportResult {
  success: boolean
  filePath?: string
  fileSize?: number
  error?: string
}

// 专业预报图导出引擎
export class ForecastExportEngine {
  // 生成预报图数据
  generateForecastData(
    config: ExportConfig,
    bestTrack: FusedPoint[],
    monteCarloResult: MonteCarloResult,
    aiAnalysis: AIAnalysisResult
  ): ForecastData {
    return {
      config,
      bestTrack,
      monteCarloResult,
      aiAnalysis,
      timestamp: new Date(),
    }
  }

  // 生成 SVG
  generateSVG(data: ForecastData): string {
    const { config, bestTrack, monteCarloResult, aiAnalysis } = data
    const { width, height, theme, layers, metadata } = config

    // 计算地图边界
    const bounds = this.calculateBounds(bestTrack)
    const mapWidth = width * 0.7
    const mapHeight = height * 0.8
    const mapX = width * 0.15
    const mapY = height * 0.15

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .title { font-family: 'Arial', sans-serif; font-size: 24px; font-weight: bold; fill: ${theme === 'dark' ? '#ffffff' : '#000000'}; }
      .subtitle { font-family: 'Arial', sans-serif; font-size: 14px; fill: ${theme === 'dark' ? '#cccccc' : '#666666'}; }
      .label { font-family: 'Arial', sans-serif; font-size: 12px; fill: ${theme === 'dark' ? '#cccccc' : '#333333'}; }
      .grid { stroke: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; stroke-width: 0.5; }
      .historical-track { fill: none; stroke: #ffffff; stroke-width: 2; }
      .forecast-track { fill: none; stroke: #ff6b6b; stroke-width: 3; stroke-dasharray: 8,4; }
      .ai-track { fill: none; stroke: #4ecdc4; stroke-width: 4; }
      .cone-50 { fill: rgba(255,107,107,0.2); stroke: rgba(255,107,107,0.5); stroke-width: 1; }
      .cone-70 { fill: rgba(255,107,107,0.15); stroke: rgba(255,107,107,0.3); stroke-width: 1; }
      .cone-90 { fill: rgba(255,107,107,0.1); stroke: rgba(255,107,107,0.2); stroke-width: 1; }
      .wind-circle { fill: none; stroke-width: 1.5; }
      .wind-34 { stroke: #22c55e; }
      .wind-50 { stroke: #eab308; }
      .wind-64 { stroke: #f97316; }
      .wind-100 { stroke: #ef4444; }
      .city { fill: ${theme === 'dark' ? '#ffffff' : '#000000'}; font-size: 10px; }
      .legend { font-family: 'Arial', sans-serif; font-size: 11px; fill: ${theme === 'dark' ? '#cccccc' : '#333333'}; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${theme === 'dark' ? '#0f172a' : '#ffffff'}"/>

  <!-- Title -->
  <text x="${width / 2}" y="40" text-anchor="middle" class="title">${metadata.title}</text>
  <text x="${width / 2}" y="60" text-anchor="middle" class="subtitle">${metadata.subtitle}</text>
  <text x="${width / 2}" y="80" text-anchor="middle" class="subtitle">发布时间: ${metadata.issuedAt.toLocaleString('zh-CN')}</text>

  <!-- Map Area -->
  <rect x="${mapX}" y="${mapY}" width="${mapWidth}" height="${mapHeight}" fill="${theme === 'dark' ? '#1e293b' : '#f0f9ff'}" stroke="${theme === 'dark' ? '#334155' : '#e2e8f0'}" stroke-width="1"/>
  `

    // 绘制经纬网
    if (layers.grid) {
      svg += this.drawGrid(bounds, mapX, mapY, mapWidth, mapHeight, theme)
    }

    // 绘制概率锥
    if (layers.probabilityCones) {
      svg += this.drawProbabilityCones(monteCarloResult, bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制历史路径
    if (layers.historicalTrack) {
      svg += this.drawHistoricalTrack(bestTrack, bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制预报路径
    if (layers.forecastTrack) {
      svg += this.drawForecastTrack(bestTrack, bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制AI路径
    if (layers.aiTrack) {
      svg += this.drawAITrack(bestTrack, bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制风圈
    if (layers.windCircles) {
      svg += this.drawWindCircles(bestTrack[0], bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制城市
    if (layers.cities) {
      svg += this.drawCities(monteCarloResult, bounds, mapX, mapY, mapWidth, mapHeight)
    }

    // 绘制图例
    if (layers.legend) {
      svg += this.drawLegend(mapX + mapWidth + 20, mapY, height * 0.6, theme)
    }

    // 绘制比例尺
    if (layers.scaleBar) {
      svg += this.drawScaleBar(mapX, mapY + mapHeight + 20, mapWidth, theme)
    }

    // 绘制指北针
    if (layers.compass) {
      svg += this.drawCompass(mapX + mapWidth - 40, mapY + 40, theme)
    }

    // 绘制信息面板
    svg += this.drawInfoPanel(bestTrack[0], aiAnalysis, width * 0.15, height * 0.85, width * 0.7, theme)

    // 绘制数据来源
    svg += `<text x="${width - 10}" y="${height - 10}" text-anchor="end" class="subtitle">数据来源: ${metadata.source} | 制作: ${metadata.analyst} | ${metadata.issuedAt.toLocaleString('zh-CN')}</text>`

    svg += '</svg>'
    return svg
  }

  // 计算边界
  private calculateBounds(track: FusedPoint[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const lats = track.map(p => p.latitude)
    const lngs = track.map(p => p.longitude)

    const padding = 5
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding,
    }
  }

  // 坐标转换
  private coordToPixel(lat: number, lng: number, bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): { x: number; y: number } {
    const x = mapX + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * mapWidth
    const y = mapY + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * mapHeight
    return { x, y }
  }

  // 绘制经纬网
  private drawGrid(bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number, theme: string): string {
    let svg = ''

    // 经线
    for (let lng = Math.ceil(bounds.minLng); lng <= Math.floor(bounds.maxLng); lng += 5) {
      const x = mapX + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * mapWidth
      svg += `<line x1="${x}" y1="${mapY}" x2="${x}" y2="${mapY + mapHeight}" class="grid"/>`
      svg += `<text x="${x}" y="${mapY + mapHeight + 15}" text-anchor="middle" class="label">${lng}°E</text>`
    }

    // 纬线
    for (let lat = Math.ceil(bounds.minLat); lat <= Math.floor(bounds.maxLat); lat += 5) {
      const y = mapY + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * mapHeight
      svg += `<line x1="${mapX}" y1="${y}" x2="${mapX + mapWidth}" y2="${y}" class="grid"/>`
      svg += `<text x="${mapX - 10}" y="${y + 4}" text-anchor="end" class="label">${lat}°N</text>`
    }

    return svg
  }

  // 绘制概率锥
  private drawProbabilityCones(monteCarloResult: MonteCarloResult, bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''

    const cones = monteCarloResult.statistics.confidenceCones

    for (const cone of cones) {
      const className = cone.probability === 0.5 ? 'cone-50' : cone.probability === 0.7 ? 'cone-70' : 'cone-90'

      // 绘制锥形
      let path = 'M'
      const points = cone.points

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const lat = p.centerLat + p.semiMinor / 111
        const { x, y } = this.coordToPixel(lat, p.centerLng, bounds, mapX, mapY, mapWidth, mapHeight)
        path += `${i === 0 ? '' : 'L'}${x},${y}`
      }

      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        const lat = p.centerLat - p.semiMinor / 111
        const { x, y } = this.coordToPixel(lat, p.centerLng, bounds, mapX, mapY, mapWidth, mapHeight)
        path += `L${x},${y}`
      }

      path += 'Z'
      svg += `<path d="${path}" class="${className}"/>`
    }

    return svg
  }

  // 绘制历史路径
  private drawHistoricalTrack(track: FusedPoint[], bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''
    const historicalPoints = track.filter(p => p.forecastHour <= 0)

    if (historicalPoints.length < 2) return svg

    let path = 'M'
    historicalPoints.forEach((p, i) => {
      const { x, y } = this.coordToPixel(p.latitude, p.longitude, bounds, mapX, mapY, mapWidth, mapHeight)
      path += `${i === 0 ? '' : 'L'}${x},${y}`
    })

    svg += `<path d="${path}" class="historical-track"/>`

    // 绘制标记点
    historicalPoints.forEach((p, i) => {
      if (i % 4 === 0) { // 每24小时一个标记
        const { x, y } = this.coordToPixel(p.latitude, p.longitude, bounds, mapX, mapY, mapWidth, mapHeight)
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#ffffff"/>`
        svg += `<text x="${x + 8}" y="${y - 8}" class="label">${Math.abs(p.forecastHour)}h前</text>`
      }
    })

    return svg
  }

  // 绘制预报路径
  private drawForecastTrack(track: FusedPoint[], bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''
    const forecastPoints = track.filter(p => p.forecastHour > 0)

    if (forecastPoints.length < 2) return svg

    let path = 'M'
    forecastPoints.forEach((p, i) => {
      const { x, y } = this.coordToPixel(p.latitude, p.longitude, bounds, mapX, mapY, mapWidth, mapHeight)
      path += `${i === 0 ? '' : 'L'}${x},${y}`
    })

    svg += `<path d="${path}" class="forecast-track"/>`

    // 绘制时间标记
    forecastPoints.forEach((p, i) => {
      if (i % 2 === 0) {
        const { x, y } = this.coordToPixel(p.latitude, p.longitude, bounds, mapX, mapY, mapWidth, mapHeight)
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#ff6b6b"/>`
        svg += `<text x="${x + 8}" y="${y - 8}" class="label">+${p.forecastHour}h</text>`
      }
    })

    return svg
  }

  // 绘制AI路径
  private drawAITrack(track: FusedPoint[], bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''
    const aiPoints = track.filter(p => p.forecastHour > 0)

    if (aiPoints.length < 2) return svg

    let path = 'M'
    aiPoints.forEach((p, i) => {
      const { x, y } = this.coordToPixel(p.latitude, p.longitude, bounds, mapX, mapY, mapWidth, mapHeight)
      path += `${i === 0 ? '' : 'L'}${x},${y}`
    })

    svg += `<path d="${path}" class="ai-track"/>`

    return svg
  }

  // 绘制风圈
  private drawWindCircles(current: FusedPoint, bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''
    const { x, y } = this.coordToPixel(current.latitude, current.longitude, bounds, mapX, mapY, mapWidth, mapHeight)

    // 34kt 风圈
    const r34 = 200 / 111 * (mapWidth / (bounds.maxLng - bounds.minLng))
    svg += `<circle cx="${x}" cy="${y}" r="${r34}" class="wind-circle wind-34"/>`

    // 50kt 风圈
    const r50 = 100 / 111 * (mapWidth / (bounds.maxLng - bounds.minLng))
    svg += `<circle cx="${x}" cy="${y}" r="${r50}" class="wind-circle wind-50"/>`

    // 64kt 风圈
    const r64 = 50 / 111 * (mapWidth / (bounds.maxLng - bounds.minLng))
    svg += `<circle cx="${x}" cy="${y}" r="${r64}" class="wind-circle wind-64"/>`

    // 台风中心
    svg += `<circle cx="${x}" cy="${y}" r="6" fill="#ff6b6b"/>`
    svg += `<text x="${x + 10}" y="${y + 4}" class="label" fill="#ff6b6b">🌀 ${current.windSpeed.toFixed(0)}kt</text>`

    return svg
  }

  // 绘制城市
  private drawCities(monteCarloResult: MonteCarloResult, bounds: any, mapX: number, mapY: number, mapWidth: number, mapHeight: number): string {
    let svg = ''

    const cities = [
      { name: '上海', lat: 31.2, lng: 121.5 },
      { name: '广州', lat: 23.1, lng: 113.3 },
      { name: '深圳', lat: 22.5, lng: 114.1 },
      { name: '厦门', lat: 24.5, lng: 118.1 },
      { name: '福州', lat: 26.1, lng: 119.3 },
      { name: '温州', lat: 28.0, lng: 120.7 },
      { name: '台北', lat: 25.0, lng: 121.5 },
      { name: '香港', lat: 22.3, lng: 114.2 },
      { name: '东京', lat: 35.7, lng: 139.7 },
      { name: '首尔', lat: 37.6, lng: 127.0 },
      { name: '马尼拉', lat: 14.6, lng: 121.0 },
    ]

    for (const city of cities) {
      if (city.lat >= bounds.minLat && city.lat <= bounds.maxLat &&
          city.lng >= bounds.minLng && city.lng <= bounds.maxLng) {
        const { x, y } = this.coordToPixel(city.lat, city.lng, bounds, mapX, mapY, mapWidth, mapHeight)
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#ffffff" stroke="#000000" stroke-width="1"/>`
        svg += `<text x="${x + 6}" y="${y + 4}" class="city">${city.name}</text>`
      }
    }

    return svg
  }

  // 绘制图例
  private drawLegend(x: number, y: number, height: number, theme: string): string {
    let svg = ''

    const items = [
      { color: '#ffffff', label: '历史路径', dash: '' },
      { color: '#ff6b6b', label: '预报路径', dash: '8,4' },
      { color: '#4ecdc4', label: 'AI路径', dash: '' },
      { color: 'rgba(255,107,107,0.2)', label: '50%概率锥', dash: '' },
      { color: 'rgba(255,107,107,0.15)', label: '70%概率锥', dash: '' },
      { color: 'rgba(255,107,107,0.1)', label: '90%概率锥', dash: '' },
      { color: '#22c55e', label: '7级风圈 (34kt)', dash: '' },
      { color: '#eab308', label: '10级风圈 (50kt)', dash: '' },
      { color: '#f97316', label: '12级风圈 (64kt)', dash: '' },
    ]

    svg += `<text x="${x}" y="${y}" class="label" font-weight="bold">图例</text>`

    items.forEach((item, i) => {
      const itemY = y + 25 + i * 25
      svg += `<line x1="${x}" y1="${itemY}" x2="${x + 30}" y2="${itemY}" stroke="${item.color}" stroke-width="2" ${item.dash ? `stroke-dasharray="${item.dash}"` : ''}/>`
      svg += `<text x="${x + 40}" y="${itemY + 4}" class="legend">${item.label}</text>`
    })

    return svg
  }

  // 绘制比例尺
  private drawScaleBar(x: number, y: number, width: number, theme: string): string {
    let svg = ''

    const scaleWidth = width * 0.3
    svg += `<line x1="${x}" y1="${y}" x2="${x + scaleWidth}" y2="${y}" stroke="${theme === 'dark' ? '#ffffff' : '#000000'}" stroke-width="2"/>`
    svg += `<line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}" stroke="${theme === 'dark' ? '#ffffff' : '#000000'}" stroke-width="2"/>`
    svg += `<line x1="${x + scaleWidth}" y1="${y - 5}" x2="${x + scaleWidth}" y2="${y + 5}" stroke="${theme === 'dark' ? '#ffffff' : '#000000'}" stroke-width="2"/>`
    svg += `<text x="${x + scaleWidth / 2}" y="${y - 10}" text-anchor="middle" class="label">500 km</text>`

    return svg
  }

  // 绘制指北针
  private drawCompass(x: number, y: number, theme: string): string {
    let svg = ''

    const size = 30
    const color = theme === 'dark' ? '#ffffff' : '#000000'

    svg += `<polygon points="${x},${y - size} ${x - size / 3},${y} ${x + size / 3},${y}" fill="${color}"/>`
    svg += `<polygon points="${x},${y + size} ${x - size / 3},${y} ${x + size / 3},${y}" fill="none" stroke="${color}" stroke-width="1"/>`
    svg += `<text x="${x}" y="${y - size - 5}" text-anchor="middle" class="label" fill="${color}">N</text>`

    return svg
  }

  // 绘制信息面板
  private drawInfoPanel(current: FusedPoint, analysis: AIAnalysisResult, x: number, y: number, width: number, theme: string): string {
    let svg = ''

    const panelHeight = 80
    const panelY = y

    svg += `<rect x="${x}" y="${panelY}" width="${width}" height="${panelHeight}" fill="${theme === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)'}" stroke="${theme === 'dark' ? '#334155' : '#e2e8f0'}" stroke-width="1" rx="4"/>`

    const col1X = x + 20
    const col2X = x + width * 0.33
    const col3X = x + width * 0.66

    svg += `<text x="${col1X}" y="${panelY + 20}" class="label" font-weight="bold">当前位置</text>`
    svg += `<text x="${col1X}" y="${panelY + 35}" class="label">${current.latitude.toFixed(1)}°N, ${current.longitude.toFixed(1)}°E</text>`
    svg += `<text x="${col1X}" y="${panelY + 50}" class="label">风速: ${Math.round(current.windSpeed)} kt</text>`
    svg += `<text x="${col1X}" y="${panelY + 65}" class="label">气压: ${Math.round(current.pressure)} hPa</text>`

    svg += `<text x="${col2X}" y="${panelY + 20}" class="label" font-weight="bold">移动信息</text>`
    svg += `<text x="${col2X}" y="${panelY + 35}" class="label">方向: ${current.movementDir || 'N'}</text>`
    svg += `<text x="${col2X}" y="${panelY + 50}" class="label">速度: ${current.movementSpeed?.toFixed(0) || '10'} kt</text>`
    svg += `<text x="${col2X}" y="${panelY + 65}" class="label">强度: ${this.classifyByWind(current.windSpeed)}</text>`

    svg += `<text x="${col3X}" y="${panelY + 20}" class="label" font-weight="bold">风险评估</text>`
    svg += `<text x="${col3X}" y="${panelY + 35}" class="label">等级: ${analysis.riskAnalysis.overallRisk}</text>`
    svg += `<text x="${col3X}" y="${panelY + 50}" class="label">可信度: ${analysis.confidenceScore}%</text>`
    svg += `<text x="${col3X}" y="${panelY + 65}" class="label">影响人口: ${(analysis.riskAnalysis.affectedPopulation / 10000).toFixed(0)}万</text>`

    return svg
  }

  private classifyByWind(windSpeed: number): string {
    if (windSpeed < 34) return '热带低压'
    if (windSpeed < 48) return '热带风暴'
    if (windSpeed < 64) return '强热带风暴'
    if (windSpeed < 90) return '台风'
    if (windSpeed < 130) return '强台风'
    return '超强台风'
  }
}

interface ForecastData {
  config: ExportConfig
  bestTrack: FusedPoint[]
  monteCarloResult: MonteCarloResult
  aiAnalysis: AIAnalysisResult
  timestamp: Date
}

// 导出引擎实例
export const forecastExportEngine = new ForecastExportEngine()
