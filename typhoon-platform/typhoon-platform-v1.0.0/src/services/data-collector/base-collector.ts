import { z } from 'zod'

// 统一数据模型
export const ForecastPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  windSpeed: z.number().min(0), // knots
  windGust: z.number().min(0).optional(),
  pressure: z.number().min(800).max(1100), // hPa
  category: z.string(),
  movementSpeed: z.number().min(0).optional(),
  movementDir: z.string().optional(),
  radius7kt: z.number().min(0).optional(), // nm
  radius10kt: z.number().min(0).optional(),
  radius12kt: z.number().min(0).optional(),
  stormRadius: z.number().min(0).optional(),
  forecastHour: z.number().int().min(0),
  timestamp: z.string().datetime(),
  confidence: z.number().min(0).max(1).optional(),
})

export const WindRadiusSchema = z.object({
  radius7kt: z.object({
    ne: z.number(),
    se: z.number(),
    sw: z.number(),
    nw: z.number(),
  }).optional(),
  radius10kt: z.object({
    ne: z.number(),
    se: z.number(),
    sw: z.number(),
    nw: z.number(),
  }).optional(),
  radius12kt: z.object({
    ne: z.number(),
    se: z.number(),
    sw: z.number(),
    nw: z.number(),
  }).optional(),
})

export const TyphoonForecastSchema = z.object({
  source: z.string(),
  sourceId: z.string(),
  internationalId: z.string().optional(),
  name: z.string(),
  nameCn: z.string().optional(),
  basin: z.string(),
  year: z.number().int(),
  modelRun: z.string().datetime(),
  points: z.array(ForecastPointSchema),
  windRadius: WindRadiusSchema.optional(),
  rawData: z.any().optional(),
})

export type ForecastPoint = z.infer<typeof ForecastPointSchema>
export type TyphoonForecastData = z.infer<typeof TyphoonForecastSchema>
export type WindRadius = z.infer<typeof WindRadiusSchema>

// 风速转换工具
export class WindConverter {
  static knotsToKmh(knots: number): number {
    return knots * 1.852
  }

  static knotsToMph(knots: number): number {
    return knots * 1.15078
  }

  static knotsToMs(knots: number): number {
    return knots * 0.514444
  }

  static kmhToKnots(kmh: number): number {
    return kmh / 1.852
  }

  static mphToKnots(mph: number): number {
    return mph / 1.15078
  }

  static msToKnots(ms: number): number {
    return ms / 0.514444
  }
}

// 台风分类工具
export class CategoryClassifier {
  static classifyByWind(windSpeedKnots: number): string {
    if (windSpeedKnots < 34) return 'TROPICAL_DEPRESSION'
    if (windSpeedKnots < 48) return 'TROPICAL_STORM'
    if (windSpeedKnots < 64) return 'SEVERE_TROPICAL_STORM'
    if (windSpeedKnots < 90) return 'TYPHOON'
    if (windSpeedKnots < 130) return 'SEVERE_TYPHOON'
    return 'SUPER_TYPHOON'
  }

  static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      TROPICAL_DEPRESSION: '#3b82f6',
      TROPICAL_STORM: '#22c55e',
      SEVERE_TROPICAL_STORM: '#eab308',
      TYPHOON: '#f97316',
      SEVERE_TYPHOON: '#ef4444',
      SUPER_TYPHOON: '#8b5cf6',
    }
    return colors[category] || '#6b7280'
  }

  static getCategoryName(category: string): string {
    const names: Record<string, string> = {
      TROPICAL_DEPRESSION: '热带低压 (TD)',
      TROPICAL_STORM: '热带风暴 (TS)',
      SEVERE_TROPICAL_STORM: '强热带风暴 (STS)',
      TYPHOON: '台风 (TY)',
      SEVERE_TYPHOON: '强台风 (STY)',
      SUPER_TYPHOON: '超强台风 (SuperTY)',
    }
    return names[category] || category
  }
}

// 基础数据采集器接口
export interface IDataCollector {
  name: string
  source: string
  baseUrl: string

  // 采集当前活跃台风
  collectActiveTyphoons(): Promise<TyphoonForecastData[]>

  // 采集特定台风预报
  collectForecast(typhoonId: string): Promise<TyphoonForecastData | null>

  // 采集历史数据
  collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]>

  // 健康检查
  healthCheck(): Promise<boolean>
}

// 基础数据采集器抽象类
export abstract class BaseCollector implements IDataCollector {
  abstract name: string
  abstract source: string
  abstract baseUrl: string

  protected timeout: number = 30000
  protected retries: number = 3

  protected async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null

    for (let i = 0; i < this.retries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          return response
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        lastError = error as Error
        console.warn(`Attempt ${i + 1} failed for ${this.source}:`, error)

        if (i < this.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }

    throw lastError || new Error(`Failed to fetch from ${this.source}`)
  }

  abstract collectActiveTyphoons(): Promise<TyphoonForecastData[]>
  abstract collectForecast(typhoonId: string): Promise<TyphoonForecastData | null>
  abstract collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]>

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}
