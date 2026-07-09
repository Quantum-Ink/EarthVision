import { TyphoonData, TyphoonPosition, TyphoonCategory } from '@/types'

// JTWC (Joint Typhoon Warning Center) data parser
export async function fetchJTWCData(): Promise<TyphoonData[]> {
  try {
    // In production, this would fetch from JTWC API
    // For now, return mock data structure
    return []
  } catch (error) {
    console.error('Error fetching JTWC data:', error)
    return []
  }
}

// NOAA data parser
export async function fetchNOAAData(): Promise<TyphoonData[]> {
  try {
    return []
  } catch (error) {
    console.error('Error fetching NOAA data:', error)
    return []
  }
}

// CMA (China Meteorological Administration) data parser
export async function fetchCMAData(): Promise<TyphoonData[]> {
  try {
    return []
  } catch (error) {
    console.error('Error fetching CMA data:', error)
    return []
  }
}

// JMA (Japan Meteorological Agency) data parser
export async function fetchJMAData(): Promise<TyphoonData[]> {
  try {
    return []
  } catch (error) {
    console.error('Error fetching JMA data:', error)
    return []
  }
}

// ECMWF data parser
export async function fetchECMWFData(): Promise<TyphoonData[]> {
  try {
    return []
  } catch (error) {
    console.error('Error fetching ECMWF data:', error)
    return []
  }
}

// Generate mock data for development
export function generateMockTyphoonData(): TyphoonData[] {
  const now = new Date()
  const positions: TyphoonPosition[] = []

  // Generate historical positions
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000)
    positions.push({
      id: `pos-${i}`,
      typhoonId: 'mock-1',
      latitude: 15 + Math.random() * 10 - i * 0.1,
      longitude: 130 + Math.random() * 5 - i * 0.2,
      windSpeed: 80 + Math.random() * 40,
      pressure: 960 - Math.random() * 20,
      category: getWindCategory(80 + Math.random() * 40),
      timestamp: time.toISOString(),
      movementSpeed: 10 + Math.random() * 5,
      movementDir: 'NW',
      radius15knots: 200 + Math.random() * 100,
      radius30knots: 100 + Math.random() * 50,
      radius50knots: 50 + Math.random() * 30,
    })
  }

  const currentPos = positions[positions.length - 1]

  return [
    {
      id: 'mock-1',
      name: 'GAEMI',
      nameCn: '格美',
      internationalId: '202404W',
      basin: 'Western Pacific',
      year: 2024,
      category: currentPos.category,
      status: 'ACTIVE',
      currentLat: currentPos.latitude,
      currentLng: currentPos.longitude,
      maxWindSpeed: currentPos.windSpeed,
      minPressure: currentPos.pressure,
      movementSpeed: currentPos.movementSpeed,
      movementDir: currentPos.movementDir,
      radius15knots: currentPos.radius15knots,
      radius30knots: currentPos.radius30knots,
      radius50knots: currentPos.radius50knots,
      startDatetime: new Date(now.getTime() - 7 * 24 * 3600000).toISOString(),
      lastUpdated: now.toISOString(),
      dataSource: 'JTWC',
      description: '超强台风格美，正在向西北方向移动',
      positions: positions,
    },
    {
      id: 'mock-2',
      name: 'PRAPIROON',
      nameCn: '派比安',
      internationalId: '202405W',
      basin: 'Western Pacific',
      year: 2024,
      category: 'TROPICAL_STORM',
      status: 'ACTIVE',
      currentLat: 12.5,
      currentLng: 125.3,
      maxWindSpeed: 45,
      minPressure: 998,
      movementSpeed: 15,
      movementDir: 'NW',
      radius15knots: 150,
      radius30knots: 80,
      radius50knots: 30,
      startDatetime: new Date(now.getTime() - 3 * 24 * 3600000).toISOString(),
      lastUpdated: now.toISOString(),
      dataSource: 'JTWC',
      description: '热带风暴派比安',
      positions: positions.slice(0, 12),
    },
    {
      id: 'mock-3',
      name: 'MARIA',
      nameCn: '玛丽亚',
      internationalId: '202406W',
      basin: 'Western Pacific',
      year: 2024,
      category: 'SEVERE_TYPHOON',
      status: 'ACTIVE',
      currentLat: 22.1,
      currentLng: 135.8,
      maxWindSpeed: 110,
      minPressure: 945,
      movementSpeed: 12,
      movementDir: 'N',
      radius15knots: 250,
      radius30knots: 120,
      radius50knots: 60,
      startDatetime: new Date(now.getTime() - 5 * 24 * 3600000).toISOString(),
      lastUpdated: now.toISOString(),
      dataSource: 'JTWC',
      description: '强台风玛丽亚，向北移动',
      positions: positions.slice(0, 18),
    }
  ]
}

function getWindCategory(windSpeed: number): TyphoonCategory {
  if (windSpeed >= 130) return 'SUPER_TYPHOON'
  if (windSpeed >= 90) return 'SEVERE_TYPHOON'
  if (windSpeed >= 64) return 'TYPHOON'
  if (windSpeed >= 48) return 'SEVERE_TROPICAL_STORM'
  if (windSpeed >= 34) return 'TROPICAL_STORM'
  return 'TROPICAL_DEPRESSION'
}

export function getDataSourceName(source: string): string {
  const names: Record<string, string> = {
    'JTWC': '联合台风警报中心',
    'NOAA': '美国国家海洋和大气管理局',
    'CMA': '中国气象局',
    'JMA': '日本气象厅',
    'ECMWF': '欧洲中期天气预报中心',
  }
  return names[source] || source
}
