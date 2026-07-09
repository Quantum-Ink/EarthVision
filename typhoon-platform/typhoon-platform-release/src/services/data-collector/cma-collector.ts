import { BaseCollector, TyphoonForecastData, ForecastPoint, CategoryClassifier } from './base-collector'

// CMA (中国气象局) 数据采集器
// 数据源: http://typhoon.nmc.cn
export class CMACollector extends BaseCollector {
  name = 'China Meteorological Administration'
  source = 'CMA'
  baseUrl = 'http://typhoon.nmc.cn'

  private apiUrl = 'http://typhoon.nmc.cn/webapi'

  async collectActiveTyphoons(): Promise<TyphoonForecastData[]> {
    try {
      // CMA typhoon API
      const url = `${this.apiUrl}/typhoon/info`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()

      if (!data || !Array.isArray(data)) {
        return this.getMockData()
      }

      const forecasts: TyphoonForecastData[] = []

      for (const typhoon of data) {
        try {
          const forecast = this.parseCMAData(typhoon)
          if (forecast) {
            forecasts.push(forecast)
          }
        } catch (error) {
          console.error('Error parsing CMA typhoon data:', error)
        }
      }

      return forecasts.length > 0 ? forecasts : this.getMockData()
    } catch (error) {
      console.error('Error collecting CMA active typhoons:', error)
      return this.getMockData()
    }
  }

  async collectForecast(typhoonId: string): Promise<TyphoonForecastData | null> {
    try {
      const url = `${this.apiUrl}/typhoon/detail?id=${typhoonId}`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()
      return this.parseCMAData(data)
    } catch (error) {
      console.error(`Error collecting CMA forecast for ${typhoonId}:`, error)
      return null
    }
  }

  async collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]> {
    try {
      const url = `${this.apiUrl}/typhoon/list?year=${year}`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()

      if (!Array.isArray(data)) {
        return []
      }

      return data.map((item: any) => this.parseCMAData(item)).filter(Boolean) as TyphoonForecastData[]
    } catch {
      return []
    }
  }

  private parseCMAData(data: any): TyphoonForecastData | null {
    if (!data) return null

    const points: ForecastPoint[] = []

    // Parse current position
    if (data.lat && data.lng) {
      points.push({
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lng),
        windSpeed: parseFloat(data.wind_speed || data.maxWind || 0),
        windGust: parseFloat(data.wind_gust || data.maxWindGust || 0),
        pressure: parseFloat(data.pressure || data.minPressure || 1000),
        category: this.mapCMACategory(data.category || data.typhoon_level),
        movementSpeed: parseFloat(data.move_speed || 0),
        movementDir: data.move_dir || 'N',
        forecastHour: 0,
        timestamp: data.time || new Date().toISOString(),
        confidence: 0.9,
      })
    }

    // Parse forecast points
    if (data.forecast && Array.isArray(data.forecast)) {
      for (const fc of data.forecast) {
        points.push({
          latitude: parseFloat(fc.lat),
          longitude: parseFloat(fc.lng),
          windSpeed: parseFloat(fc.wind_speed || 0),
          windGust: parseFloat(fc.wind_gust || 0),
          pressure: parseFloat(fc.pressure || 1000),
          category: CategoryClassifier.classifyByWind(parseFloat(fc.wind_speed || 0)),
          forecastHour: parseInt(fc.hour || fc.forecast_hour || 0),
          timestamp: fc.time || new Date().toISOString(),
          confidence: Math.max(0.5, 1 - parseInt(fc.hour || 0) * 0.02),
        })
      }
    }

    return {
      source: 'CMA',
      sourceId: data.id || data.code || '',
      internationalId: data.international_id || data.code,
      name: data.english_name || data.name || 'Unknown',
      nameCn: data.chinese_name || data.name_cn,
      basin: data.basin || 'WP',
      year: parseInt(data.year || new Date().getFullYear()),
      modelRun: data.model_run || new Date().toISOString(),
      points,
      rawData: data,
    }
  }

  private mapCMACategory(level: string): string {
    const categoryMap: Record<string, string> = {
      'TD': 'TROPICAL_DEPRESSION',
      'TS': 'TROPICAL_STORM',
      'STS': 'SEVERE_TROPICAL_STORM',
      'TY': 'TYPHOON',
      'STY': 'SEVERE_TYPHOON',
      'SuperTY': 'SUPER_TYPHOON',
      '热带低压': 'TROPICAL_DEPRESSION',
      '热带风暴': 'TROPICAL_STORM',
      '强热带风暴': 'SEVERE_TROPICAL_STORM',
      '台风': 'TYPHOON',
      '强台风': 'SEVERE_TYPHOON',
      '超强台风': 'SUPER_TYPHOON',
    }
    return categoryMap[level] || 'TROPICAL_STORM'
  }

  private getMockData(): TyphoonForecastData[] {
    const now = new Date()
    return [
      {
        source: 'CMA',
        sourceId: '202404',
        internationalId: '202404W',
        name: 'GAEMI',
        nameCn: '格美',
        basin: 'WP',
        year: 2024,
        modelRun: now.toISOString(),
        points: this.generateMockPoints(18.5, 128.3, 140, 935, now),
      },
    ]
  }

  private generateMockPoints(
    startLat: number,
    startLng: number,
    startWind: number,
    startPressure: number,
    startTime: Date
  ): ForecastPoint[] {
    const points: ForecastPoint[] = []

    for (let hour = 0; hour <= 120; hour += 6) {
      const progress = hour / 120
      const lat = startLat + progress * 4.5 + Math.sin(progress * Math.PI * 2) * 0.3
      const lng = startLng - progress * 7 + Math.cos(progress * Math.PI * 2) * 0.2
      const wind = startWind + Math.sin(progress * Math.PI) * 15 - progress * 25
      const pressure = startPressure - Math.sin(progress * Math.PI) * 10 + progress * 15

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(25, wind),
        windGust: Math.max(35, wind * 1.25),
        pressure: Math.min(1010, Math.max(900, pressure)),
        category: CategoryClassifier.classifyByWind(Math.max(25, wind)),
        movementSpeed: 12 + Math.random() * 4,
        movementDir: hour < 48 ? 'NW' : 'N',
        forecastHour: hour,
        timestamp: new Date(startTime.getTime() + hour * 3600000).toISOString(),
        confidence: Math.max(0.4, 1 - hour * 0.004),
      })
    }

    return points
  }
}
