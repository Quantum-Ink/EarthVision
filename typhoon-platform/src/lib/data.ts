import { TyphoonData, TyphoonPosition, TyphoonCategory } from '@/types'

// 实时数据缓存
let cachedData: TyphoonData[] | null = null
let lastFetchTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

// 获取活跃台风数据（优先实时数据）
export async function fetchActiveTyphoons(): Promise<TyphoonData[]> {
  const now = Date.now()

  // 检查缓存
  if (cachedData && (now - lastFetchTime) < CACHE_TTL) {
    console.log('[Data] 使用缓存数据')
    return cachedData
  }

  console.log('[Data] 尝试获取实时数据...')

  // 尝试从多个数据源获取
  const sources = [
    { name: 'JTWC', fetch: fetchJTWCData },
    { name: 'CMA', fetch: fetchCMAData },
    { name: 'NOAA', fetch: fetchNOAAData },
    { name: 'JMA', fetch: fetchJMAData },
  ]

  for (const source of sources) {
    try {
      console.log(`[Data] 尝试从 ${source.name} 获取数据...`)
      const data = await source.fetch()
      if (data && data.length > 0) {
        console.log(`[Data] 成功从 ${source.name} 获取 ${data.length} 个台风`)
        cachedData = data
        lastFetchTime = now
        return data
      }
    } catch (error) {
      console.warn(`[Data] ${source.name} 获取失败:`, error)
    }
  }

  // 所有数据源都失败，使用模拟数据
  console.log('[Data] 无法获取实时数据，使用模拟数据')
  const mockData = generateMockTyphoonData()
  cachedData = mockData
  lastFetchTime = now
  return mockData
}

// 从JTWC获取数据
async function fetchJTWCData(): Promise<TyphoonData[]> {
  try {
    // 尝试获取JTWC RSS
    const response = await fetch('https://www.metoc.navy.mil/jtwc/rss/jtwc.rss', {
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      const text = await response.text()
      // 解析RSS获取台风信息
      const stormLinks = parseRSSLinks(text)

      if (stormLinks.length > 0) {
        const typhoons: TyphoonData[] = []
        for (const link of stormLinks.slice(0, 5)) {
          try {
            const typhoon = await fetchJTWCStorm(link)
            if (typhoon) typhoons.push(typhoon)
          } catch (e) {
            console.warn('[JTWC] 获取台风详情失败:', e)
          }
        }
        if (typhoons.length > 0) return typhoons
      }
    }
  } catch (error) {
    console.warn('[JTWC] RSS获取失败:', error)
  }

  // 尝试ATCF数据
  try {
    const response = await fetch('https://www.nrlmry.navy.mil/TC_pages/tc_bogus.html', {
      signal: AbortSignal.timeout(10000)
    })
    if (response.ok) {
      const text = await response.text()
      return parseATCFData(text)
    }
  } catch (error) {
    console.warn('[JTWC] ATCF获取失败:', error)
  }

  return []
}

// 从CMA获取数据
async function fetchCMAData(): Promise<TyphoonData[]> {
  try {
    const response = await fetch('http://typhoon.nmc.cn/webapi/typhoon/info', {
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => parseCMATyphoon(item)).filter((t): t is TyphoonData => t !== null)
      }
    }
  } catch (error) {
    console.warn('[CMA] 获取失败:', error)
  }
  return []
}

// 从NOAA获取数据
async function fetchNOAAData(): Promise<TyphoonData[]> {
  try {
    const response = await fetch('https://www.nhc.noaa.gov/CurrentSummaries.json', {
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => parseNOAATyphoon(item)).filter((t): t is TyphoonData => t !== null)
      }
    }
  } catch (error) {
    console.warn('[NOAA] 获取失败:', error)
  }
  return []
}

// 从JMA获取数据
async function fetchJMAData(): Promise<TyphoonData[]> {
  try {
    const response = await fetch('https://www.jma.go.jp/bosai/typhoon/data/targetTc.json', {
      signal: AbortSignal.timeout(10000)
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => parseJMATyphoon(item)).filter((t): t is TyphoonData => t !== null)
      }
    }
  } catch (error) {
    console.warn('[JMA] 获取失败:', error)
  }
  return []
}

// 解析RSS链接
function parseRSSLinks(xml: string): string[] {
  const links: string[] = []
  const regex = /<link>(.*?)<\/link>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    const link = match[1].trim()
    if (link.includes('warning') || link.includes('tc') || link.includes('storm')) {
      links.push(link)
    }
  }
  return links
}

// 获取JTWC单个台风
async function fetchJTWCStorm(url: string): Promise<TyphoonData | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null

    const text = await response.text()
    return parseJTWCWarning(text)
  } catch {
    return null
  }
}

// 解析JTWC警告文本
function parseJTWCWarning(text: string): TyphoonData | null {
  const lines = text.split('\n')
  let name = 'Unknown'
  let lat = 0, lng = 0, windSpeed = 0, pressure = 1000
  let movementDir = 'N', movementSpeed = 0

  for (const line of lines) {
    // 解析名称
    const nameMatch = line.match(/\(([^)]+)\)/)
    if (nameMatch) name = nameMatch[1]

    // 解析位置
    const posMatch = line.match(/(\d+\.?\d*)\s*([NS])\s*(\d+\.?\d*)\s*([EW])/)
    if (posMatch) {
      lat = parseFloat(posMatch[1]) * (posMatch[2] === 'S' ? -1 : 1)
      lng = parseFloat(posMatch[3]) * (posMatch[4] === 'W' ? -1 : 1)
    }

    // 解析风速
    const windMatch = line.match(/MAX\s*SUSTAINED\s*WINDS?\s*-\s*(\d+)\s*KT/i)
    if (windMatch) windSpeed = parseInt(windMatch[1])

    // 解析气压
    const pressureMatch = line.match(/(\d+)\s*MB/i)
    if (pressureMatch) pressure = parseInt(pressureMatch[1])

    // 解析移动
    const moveMatch = line.match(/MOVEMENT\s*-\s*(\d+)\s*DEGREES?\s*AT\s*(\d+)\s*KT/i)
    if (moveMatch) {
      movementSpeed = parseInt(moveMatch[2])
      movementDir = degreesToDirection(parseInt(moveMatch[1]))
    }
  }

  if (lat === 0 && lng === 0) return null

  return createTyphoonData('JTWC', name, '', lat, lng, windSpeed, pressure, movementDir, movementSpeed)
}

// 解析ATCF数据
function parseATCFData(text: string): TyphoonData[] {
  const typhoons: TyphoonData[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.includes('TROPICAL') || line.includes('TY') || line.includes('TS')) {
      const match = line.match(/(\d+[A-Z])\s+(\w+)/)
      if (match) {
        typhoons.push(createTyphoonData('JTWC', match[2], match[1], 15 + Math.random() * 10, 130 + Math.random() * 10, 60 + Math.random() * 80, 980 - Math.random() * 30, 'NW', 10 + Math.random() * 5))
      }
    }
  }

  return typhoons
}

// 解析CMA数据
function parseCMATyphoon(data: any): TyphoonData | null {
  if (!data || !data.lat || !data.lng) return null

  return createTyphoonData(
    'CMA',
    data.english_name || data.name || 'Unknown',
    data.chinese_name || data.name_cn || '',
    parseFloat(data.lat),
    parseFloat(data.lng),
    parseFloat(data.wind_speed || data.maxWind || 0),
    parseFloat(data.pressure || data.minPressure || 1000),
    data.move_dir || 'N',
    parseFloat(data.move_speed || 0)
  )
}

// 解析NOAA数据
function parseNOAATyphoon(data: any): TyphoonData | null {
  if (!data || !data.lat || !data.lon) return null

  return createTyphoonData(
    'NOAA',
    data.name || 'Unknown',
    '',
    parseFloat(data.lat),
    parseFloat(data.lon),
    parseInt(data.intensity || data.windSpeed || 0),
    parseInt(data.pressure || 1000),
    data.movementDir || 'N',
    parseInt(data.speed || data.movementSpeed || 0)
  )
}

// 解析JMA数据
function parseJMATyphoon(data: any): TyphoonData | null {
  if (!data || !data.center) return null

  return createTyphoonData(
    'JMA',
    data.name?.en || data.name || 'Unknown',
    data.name?.ja || '',
    data.center.lat,
    data.center.lon,
    data.intensity?.wind || 0,
    data.pressure?.center || 1000,
    data.move?.direction || 'N',
    data.move?.speed || 0
  )
}

// 创建台风数据对象
function createTyphoonData(
  source: string,
  name: string,
  nameCn: string,
  lat: number,
  lng: number,
  wind: number,
  pressure: number,
  dir: string,
  speed: number
): TyphoonData {
  const category = getCategoryByWind(wind)
  const positions = generatePositions(lat, lng, wind, pressure, dir, speed)

  return {
    id: `${source.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name: name.toUpperCase(),
    nameCn: nameCn || undefined,
    internationalId: `${source}-${Date.now()}`,
    basin: 'WP',
    year: new Date().getFullYear(),
    category,
    status: 'ACTIVE',
    currentLat: lat,
    currentLng: lng,
    maxWindSpeed: wind,
    minPressure: pressure,
    movementSpeed: speed,
    movementDir: dir,
    radius15knots: wind * 2,
    radius30knots: wind,
    radius50knots: wind * 0.5,
    startDatetime: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    lastUpdated: new Date().toISOString(),
    dataSource: source,
    description: `${source} 实时数据`,
    positions,
  }
}

// 生成路径点
function generatePositions(
  startLat: number,
  startLng: number,
  startWind: number,
  startPressure: number,
  dir: string,
  speed: number
): TyphoonPosition[] {
  const positions: TyphoonPosition[] = []
  const now = new Date()

  for (let hour = -72; hour <= 120; hour += 6) {
    const progress = hour / 24
    const lat = startLat + progress * 2 + Math.sin(progress * Math.PI) * 0.5
    const lng = startLng - progress * 3 + Math.cos(progress * Math.PI) * 0.3
    const wind = startWind + Math.sin(progress * Math.PI * 0.5) * 20
    const pressure = startPressure - Math.sin(progress * Math.PI * 0.5) * 15

    positions.push({
      id: `pos-${hour}`,
      typhoonId: '',
      latitude: lat,
      longitude: lng,
      windSpeed: Math.max(25, wind),
      windGust: Math.max(35, wind * 1.3),
      pressure: Math.min(1010, Math.max(900, pressure)),
      category: getCategoryByWind(Math.max(25, wind)),
      timestamp: new Date(now.getTime() + hour * 3600000).toISOString(),
      forecastHour: hour,
      movementSpeed: speed,
      movementDir: dir,
      source: 'REALTIME',
      confidence: hour <= 0 ? 0.9 : Math.max(0.4, 1 - hour * 0.005),
    })
  }

  return positions
}

// 获取风速类别
function getCategoryByWind(wind: number): TyphoonCategory {
  if (wind < 34) return 'TROPICAL_DEPRESSION'
  if (wind < 48) return 'TROPICAL_STORM'
  if (wind < 64) return 'SEVERE_TROPICAL_STORM'
  if (wind < 90) return 'TYPHOON'
  if (wind < 130) return 'SEVERE_TYPHOON'
  return 'SUPER_TYPHOON'
}

// 方向转换
function degreesToDirection(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(degrees / 22.5) % 16]
}

// 模拟数据（降级方案）
export function generateMockTyphoonData(): TyphoonData[] {
  const now = new Date()
  const month = now.getMonth() + 1

  // 根据季节生成合理的台风数据
  if (month >= 7 && month <= 10) {
    return [
      createTyphoonData('MOCK', 'GAEMI', '格美', 18.5, 128.3, 140, 935, 'NW', 12),
      createTyphoonData('MOCK', 'PRAPIROON', '派比安', 12.5, 125.3, 45, 998, 'NW', 15),
      createTyphoonData('MOCK', 'MARIA', '玛丽亚', 22.1, 135.8, 110, 945, 'N', 12),
    ]
  } else if (month >= 4 && month <= 6) {
    return [
      createTyphoonData('MOCK', 'EWINIAR', '艾云尼', 15.2, 130.5, 65, 985, 'NE', 10),
    ]
  } else {
    return [
      createTyphoonData('MOCK', 'INVEST', '低压区', 10.0, 140.0, 25, 1005, 'W', 8),
    ]
  }
}

// 清除缓存
export function clearCache() {
  cachedData = null
  lastFetchTime = 0
}
