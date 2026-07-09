import { BaseCollector, TyphoonForecastData, ForecastPoint, CategoryClassifier } from './base-collector'

// ECMWF (欧洲中期天气预报中心) 数据采集器
export class ECMWFCollector extends BaseCollector {
  name = 'European Centre for Medium-Range Weather Forecasts'
  source = 'ECMWF'
  baseUrl = 'https://www.ecmwf.int'

  private apiUrl = 'https://apps.ecmwf.int/datasets/data'

  async collectActiveTyphoons(): Promise<TyphoonForecastData[]> {
    try {
      // ECMWF provides data through their ECPDS system
      // For demonstration, we'll use mock data
      return this.getMockData()
    } catch (error) {
      console.error('Error collecting ECMWF active typhoons:', error)
      return this.getMockData()
    }
  }

  async collectForecast(typhoonId: string): Promise<TyphoonForecastData | null> {
    try {
      // ECMWF forecast data retrieval
      return null
    } catch (error) {
      console.error(`Error collecting ECMWF forecast for ${typhoonId}:`, error)
      return null
    }
  }

  async collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]> {
    return []
  }

  private getMockData(): TyphoonForecastData[] {
    const now = new Date()
    return [
      {
        source: 'ECMWF',
        sourceId: 'EC04W',
        internationalId: '202404W',
        name: 'GAEMI',
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

    for (let hour = 0; hour <= 240; hour += 12) {
      const progress = hour / 240
      const lat = startLat + progress * 6 + Math.sin(progress * Math.PI * 2) * 0.5
      const lng = startLng - progress * 10 + Math.cos(progress * Math.PI * 2) * 0.4
      const wind = startWind + Math.sin(progress * Math.PI * 1.5) * 20 - progress * 35
      const pressure = startPressure - Math.sin(progress * Math.PI * 1.5) * 15 + progress * 25

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(20, wind),
        windGust: Math.max(30, wind * 1.35),
        pressure: Math.min(1015, Math.max(890, pressure)),
        category: CategoryClassifier.classifyByWind(Math.max(20, wind)),
        movementSpeed: 13 + Math.random() * 5,
        movementDir: hour < 72 ? 'NW' : hour < 144 ? 'N' : 'NNE',
        forecastHour: hour,
        timestamp: new Date(startTime.getTime() + hour * 3600000).toISOString(),
        confidence: Math.max(0.3, 1 - hour * 0.003),
      })
    }

    return points
  }
}
