import { BaseCollector, TyphoonForecastData, ForecastPoint, CategoryClassifier } from './base-collector'

// JMA (日本气象厅) 数据采集器
// 数据源: https://www.jma.go.jp
export class JMACollector extends BaseCollector {
  name = 'Japan Meteorological Agency'
  source = 'JMA'
  baseUrl = 'https://www.jma.go.jp'

  private apiUrl = 'https://www.jma.go.jp/bosai/typhoon'

  async collectActiveTyphoons(): Promise<TyphoonForecastData[]> {
    try {
      const url = `${this.apiUrl}/data/targetTc.json`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()

      if (!data || !Array.isArray(data)) {
        return this.getMockData()
      }

      return data.map((item: any) => this.parseJMAData(item)).filter(Boolean) as TyphoonForecastData[]
    } catch (error) {
      console.error('Error collecting JMA active typhoons:', error)
      return this.getMockData()
    }
  }

  async collectForecast(typhoonId: string): Promise<TyphoonForecastData | null> {
    try {
      const url = `${this.apiUrl}/data/${typhoonId}.json`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()
      return this.parseJMAData(data)
    } catch (error) {
      console.error(`Error collecting JMA forecast for ${typhoonId}:`, error)
      return null
    }
  }

  async collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]> {
    // JMA historical data is available via their API
    return []
  }

  private parseJMAData(data: any): TyphoonForecastData | null {
    if (!data) return null

    const points: ForecastPoint[] = []

    // Parse current position from JMA format
    if (data.center) {
      points.push({
        latitude: data.center.lat,
        longitude: data.center.lon,
        windSpeed: data.intensity?.wind || 0,
        windGust: data.intensity?.gust || 0,
        pressure: data.pressure?.center || 1000,
        category: this.mapJMACategory(data.class || data.category),
        movementSpeed: data.move?.speed || 0,
        movementDir: data.move?.direction || 'N',
        forecastHour: 0,
        timestamp: data.time || new Date().toISOString(),
        confidence: 0.9,
      })
    }

    // Parse forecast points from JMA format
    if (data.forecast && Array.isArray(data.forecast)) {
      for (const fc of data.forecast) {
        if (fc.center) {
          points.push({
            latitude: fc.center.lat,
            longitude: fc.center.lon,
            windSpeed: fc.intensity?.wind || 0,
            windGust: fc.intensity?.gust || 0,
            pressure: fc.pressure?.center || 1000,
            category: CategoryClassifier.classifyByWind(fc.intensity?.wind || 0),
            forecastHour: fc.hour || 0,
            timestamp: fc.time || new Date().toISOString(),
            confidence: Math.max(0.5, 1 - (fc.hour || 0) * 0.02),
          })
        }
      }
    }

    return {
      source: 'JMA',
      sourceId: data.id || data.typhoonNumber || '',
      internationalId: data.internationalId,
      name: data.name?.en || data.name || 'Unknown',
      nameCn: data.name?.ja || data.nameJp,
      basin: 'WP',
      year: parseInt(data.year || new Date().getFullYear()),
      modelRun: data.modelRun || new Date().toISOString(),
      points,
      rawData: data,
    }
  }

  private mapJMACategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'TD': 'TROPICAL_DEPRESSION',
      'TS': 'TROPICAL_STORM',
      'STS': 'SEVERE_TROPICAL_STORM',
      'TY': 'TYPHOON',
      'VSTY': 'SEVERE_TYPHOON',
      'SuperTY': 'SUPER_TYPHOON',
    }
    return categoryMap[category] || 'TROPICAL_STORM'
  }

  private getMockData(): TyphoonForecastData[] {
    const now = new Date()
    return [
      {
        source: 'JMA',
        sourceId: '202404',
        internationalId: '202404W',
        name: 'GAEMI',
        nameCn: 'ゲーミー',
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
      const lat = startLat + progress * 5.5 + Math.sin(progress * Math.PI * 2) * 0.4
      const lng = startLng - progress * 9 + Math.cos(progress * Math.PI * 2) * 0.3
      const wind = startWind + Math.sin(progress * Math.PI) * 18 - progress * 28
      const pressure = startPressure - Math.sin(progress * Math.PI) * 12 + progress * 18

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(25, wind),
        windGust: Math.max(35, wind * 1.3),
        pressure: Math.min(1010, Math.max(900, pressure)),
        category: CategoryClassifier.classifyByWind(Math.max(25, wind)),
        movementSpeed: 11 + Math.random() * 4,
        movementDir: hour < 48 ? 'NW' : 'NNE',
        forecastHour: hour,
        timestamp: new Date(startTime.getTime() + hour * 3600000).toISOString(),
        confidence: Math.max(0.45, 1 - hour * 0.004),
      })
    }

    return points
  }
}
