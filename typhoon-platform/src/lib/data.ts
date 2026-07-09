import { TyphoonData, TyphoonPosition, TyphoonCategory } from '@/types'
import { collectorRegistry } from '@/services/data-collector/registry'

// 获取当前活跃台风数据
export async function fetchActiveTyphoons(): Promise<TyphoonData[]> {
  try {
    console.log('[Data] 开始获取活跃台风数据...')

    // 尝试从多个数据源获取数据
    const results = await collectorRegistry.collectAll()

    const typhoons: TyphoonData[] = []

    for (const [source, forecasts] of results) {
      for (const forecast of forecasts) {
        const existing = typhoons.find(t =>
          t.internationalId === forecast.internationalId ||
          t.name === forecast.name
        )

        if (!existing) {
          typhoons.push(convertToTyphoonData(forecast))
        }
      }
    }

    if (typhoons.length > 0) {
      console.log(`[Data] 成功获取 ${typhoons.length} 个活跃台风`)
      return typhoons
    }

    console.log('[Data] 无法获取实时数据，使用模拟数据')
    return generateMockTyphoonData()
  } catch (error) {
    console.error('[Data] 获取数据失败:', error)
    return generateMockTyphoonData()
  }
}

// 转换为统一格式
function convertToTyphoonData(forecast: any): TyphoonData {
  const positions: TyphoonPosition[] = forecast.points.map((point: any, index: number) => ({
    id: `pos-${forecast.sourceId}-${index}`,
    typhoonId: forecast.sourceId,
    latitude: point.latitude,
    longitude: point.longitude,
    windSpeed: point.windSpeed,
    windGust: point.windGust,
    pressure: point.pressure,
    category: point.category as TyphoonCategory,
    timestamp: point.timestamp,
    forecastHour: point.forecastHour,
    movementSpeed: point.movementSpeed,
    movementDir: point.movementDir,
    radius7kt: point.radius7kt,
    radius10kt: point.radius10kt,
    radius12kt: point.radius12kt,
    source: forecast.source,
    confidence: point.confidence,
  }))

  const currentPoint = positions[0] || {
    latitude: 0,
    longitude: 0,
    windSpeed: 0,
    pressure: 1000,
    category: 'TROPICAL_STORM' as TyphoonCategory,
  }

  return {
    id: forecast.sourceId,
    name: forecast.name,
    nameCn: forecast.nameCn,
    internationalId: forecast.internationalId,
    basin: forecast.basin || 'WP',
    year: forecast.year || new Date().getFullYear(),
    category: currentPoint.category as TyphoonCategory,
    status: 'ACTIVE',
    currentLat: currentPoint.latitude,
    currentLng: currentPoint.longitude,
    maxWindSpeed: Math.max(...positions.map(p => p.windSpeed)),
    minPressure: Math.min(...positions.map(p => p.pressure)),
    movementSpeed: currentPoint.movementSpeed,
    movementDir: currentPoint.movementDir,
    radius15knots: currentPoint.radius15knots,
    radius30knots: currentPoint.radius30knots,
    radius50knots: currentPoint.radius50knots,
    startDatetime: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    lastUpdated: new Date().toISOString(),
    dataSource: forecast.source,
    description: `${forecast.source} 数据源`,
    positions,
  }
}

// 模拟数据（仅在无法获取真实数据时使用）
export function generateMockTyphoonData(): TyphoonData[] {
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  // 根据当前月份生成合理的台风数据
  const typhoons: Array<{
    id: string
    name: string
    nameCn: string
    internationalId: string
    lat: number
    lng: number
    wind: number
    pressure: number
    category: TyphoonCategory
    dir: string
    speed: number
    radius15: number
    radius30: number
    radius50: number
  }> = []

  if (currentMonth >= 7 && currentMonth <= 10) {
    typhoons.push(
      { id: 'mock-1', name: 'GAEMI', nameCn: '格美', internationalId: '202404W', lat: 18.5, lng: 128.3, wind: 140, pressure: 935, category: 'SUPER_TYPHOON', dir: 'NW', speed: 12, radius15: 300, radius30: 150, radius50: 80 },
      { id: 'mock-2', name: 'PRAPIROON', nameCn: '派比安', internationalId: '202405W', lat: 12.5, lng: 125.3, wind: 45, pressure: 998, category: 'TROPICAL_STORM', dir: 'NW', speed: 15, radius15: 150, radius30: 80, radius50: 30 },
      { id: 'mock-3', name: 'MARIA', nameCn: '玛丽亚', internationalId: '202406W', lat: 22.1, lng: 135.8, wind: 110, pressure: 945, category: 'SEVERE_TYPHOON', dir: 'N', speed: 12, radius15: 250, radius30: 120, radius50: 60 },
    )
  } else if (currentMonth >= 4 && currentMonth <= 6) {
    typhoons.push(
      { id: 'mock-1', name: 'EWINIAR', nameCn: '艾云尼', internationalId: '202401W', lat: 15.2, lng: 130.5, wind: 65, pressure: 985, category: 'TYPHOON', dir: 'NE', speed: 10, radius15: 200, radius30: 100, radius50: 50 },
    )
  } else {
    typhoons.push(
      { id: 'mock-1', name: 'INVEST', nameCn: '低压区', internationalId: '90W', lat: 10.0, lng: 140.0, wind: 25, pressure: 1005, category: 'TROPICAL_DEPRESSION', dir: 'W', speed: 8, radius15: 100, radius30: 0, radius50: 0 },
    )
  }

  return typhoons.map(ty => {
    const positions: TyphoonPosition[] = []
    for (let hour = 0; hour <= 120; hour += 6) {
      const progress = hour / 120
      const lat = ty.lat + progress * 5 + Math.sin(progress * Math.PI * 2) * 0.5
      const lng = ty.lng - progress * 8 + Math.cos(progress * Math.PI * 2) * 0.3
      const wind = ty.wind + Math.sin(progress * Math.PI) * 20 - progress * 30
      const pressure = ty.pressure - Math.sin(progress * Math.PI) * 15 + progress * 20

      positions.push({
        id: `${ty.id}-pos-${hour}`,
        typhoonId: ty.id,
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(25, wind),
        windGust: Math.max(35, wind * 1.3),
        pressure: Math.min(1010, Math.max(900, pressure)),
        category: getCategoryByWind(Math.max(25, wind)),
        timestamp: new Date(now.getTime() + hour * 3600000).toISOString(),
        forecastHour: hour,
        movementSpeed: ty.speed + Math.random() * 3,
        movementDir: ty.dir,
        radius15knots: ty.radius15,
        radius30knots: ty.radius30,
        radius50knots: ty.radius50,
        source: 'MOCK',
        confidence: Math.max(0.4, 1 - hour * 0.005),
      })
    }

    return {
      id: ty.id,
      name: ty.name,
      nameCn: ty.nameCn,
      internationalId: ty.internationalId,
      basin: 'WP',
      year: 2024,
      category: ty.category,
      status: 'ACTIVE' as const,
      currentLat: ty.lat,
      currentLng: ty.lng,
      maxWindSpeed: ty.wind,
      minPressure: ty.pressure,
      movementSpeed: ty.speed,
      movementDir: ty.dir,
      radius15knots: ty.radius15,
      radius30knots: ty.radius30,
      radius50knots: ty.radius50,
      startDatetime: new Date(now.getTime() - 7 * 24 * 3600000).toISOString(),
      lastUpdated: now.toISOString(),
      dataSource: 'MOCK',
      description: '模拟数据（无法获取实时数据时使用）',
      positions,
    }
  })
}

function getCategoryByWind(wind: number): TyphoonCategory {
  if (wind < 34) return 'TROPICAL_DEPRESSION'
  if (wind < 48) return 'TROPICAL_STORM'
  if (wind < 64) return 'SEVERE_TROPICAL_STORM'
  if (wind < 90) return 'TYPHOON'
  if (wind < 130) return 'SEVERE_TYPHOON'
  return 'SUPER_TYPHOON'
}
