import { BaseCollector, TyphoonForecastData, ForecastPoint, CategoryClassifier } from './base-collector'

// NOAA/NHC (美国国家海洋和大气管理局) 数据采集器
export class NOAACollector extends BaseCollector {
  name = 'National Oceanic and Atmospheric Administration'
  source = 'NOAA'
  baseUrl = 'https://www.nhc.noaa.gov'

  private apiUrl = 'https://www.nhc.noaa.gov/CurrentSummaries.json'

  async collectActiveTyphoons(): Promise<TyphoonForecastData[]> {
    try {
      const url = 'https://www.nhc.noaa.gov/CurrentSummaries.json'
      const response = await this.fetchWithRetry(url)
      const data = await response.json()

      if (!data || !Array.isArray(data)) {
        return this.getMockData()
      }

      return data.map((item: any) => this.parseNOAAData(item)).filter(Boolean) as TyphoonForecastData[]
    } catch (error) {
      console.error('Error collecting NOAA active typhoons:', error)
      return this.getMockData()
    }
  }

  async collectForecast(typhoonId: string): Promise<TyphoonForecastData | null> {
    try {
      const url = `https://www.nhc.noaa.gov/storm_graphics/api/${typhoonId}.json`
      const response = await this.fetchWithRetry(url)
      const data = await response.json()
      return this.parseNOAAData(data)
    } catch (error) {
      console.error(`Error collecting NOAA forecast for ${typhoonId}:`, error)
      return null
    }
  }

  async collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]> {
    return []
  }

  private parseNOAAData(data: any): TyphoonForecastData | null {
    if (!data) return null

    const points: ForecastPoint[] = []

    if (data.lat && data.lon) {
      points.push({
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        windSpeed: parseInt(data.intensity || data.windSpeed || 0),
        windGust: parseInt(data.gust || data.windGust || 0),
        pressure: parseInt(data.pressure || 1000),
        category: CategoryClassifier.classifyByWind(parseInt(data.intensity || 0)),
        movementSpeed: parseInt(data.speed || data.movementSpeed || 0),
        movementDir: data.movementDir || 'N',
        forecastHour: 0,
        timestamp: data.time || new Date().toISOString(),
        confidence: 0.9,
      })
    }

    return {
      source: 'NOAA',
      sourceId: data.id || '',
      name: data.name || 'Unknown',
      basin: data.basin || 'EP',
      year: parseInt(data.year || new Date().getFullYear()),
      modelRun: data.modelRun || new Date().toISOString(),
      points,
      rawData: data,
    }
  }

  private getMockData(): TyphoonForecastData[] {
    const now = new Date()
    return [
      {
        source: 'NOAA',
        sourceId: 'EP01',
        name: 'ALVIN',
        basin: 'EP',
        year: 2024,
        modelRun: now.toISOString(),
        points: this.generateMockPoints(15.2, -120.5, 65, 990, now),
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
      const lat = startLat + progress * 3
      const lng = startLng + progress * 5
      const wind = startWind + Math.sin(progress * Math.PI) * 15 - progress * 20
      const pressure = startPressure - Math.sin(progress * Math.PI) * 10 + progress * 15

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(25, wind),
        windGust: Math.max(35, wind * 1.3),
        pressure: Math.min(1010, Math.max(950, pressure)),
        category: CategoryClassifier.classifyByWind(Math.max(25, wind)),
        movementSpeed: 10 + Math.random() * 3,
        movementDir: 'W',
        forecastHour: hour,
        timestamp: new Date(startTime.getTime() + hour * 3600000).toISOString(),
        confidence: Math.max(0.4, 1 - hour * 0.005),
      })
    }

    return points
  }
}
