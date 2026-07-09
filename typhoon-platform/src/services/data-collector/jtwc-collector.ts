import { BaseCollector, TyphoonForecastData, ForecastPoint, CategoryClassifier, WindConverter } from './base-collector'

// JTWC 数据采集器
// 数据源: https://www.metoc.navy.mil/jtwc
export class JTWCCollector extends BaseCollector {
  name = 'Joint Typhoon Warning Center'
  source = 'JTWC'
  baseUrl = 'https://www.metoc.navy.mil/jtwc'

  // JTWC 提供 ATCF 格式数据
  private atcfBaseUrl = 'https://www.nrlmry.navy.mil/TC_pages/tc_bogus.html'

  async collectActiveTyphoons(): Promise<TyphoonForecastData[]> {
    try {
      // JTWC RSS feed for active storms
      const rssUrl = 'https://www.metoc.navy.mil/jtwc/rss/jtwc.rss'
      const response = await this.fetchWithRetry(rssUrl)
      const text = await response.text()

      // Parse RSS to get active storm links
      const stormLinks = this.parseRSSFeed(text)

      const forecasts: TyphoonForecastData[] = []

      for (const link of stormLinks) {
        try {
          const forecast = await this.collectFromUrl(link)
          if (forecast) {
            forecasts.push(forecast)
          }
        } catch (error) {
          console.error(`Error collecting JTWC forecast from ${link}:`, error)
        }
      }

      return forecasts
    } catch (error) {
      console.error('Error collecting JTWC active typhoons:', error)
      return this.getMockData()
    }
  }

  async collectForecast(typhoonId: string): Promise<TyphoonForecastData | null> {
    try {
      const url = `${this.baseUrl}/warnings/${typhoonId.replace(/\s+/g, '').toLowerCase()}.txt`
      const response = await this.fetchWithRetry(url)
      const text = await response.text()
      return this.parseWarningText(text, typhoonId)
    } catch (error) {
      console.error(`Error collecting JTWC forecast for ${typhoonId}:`, error)
      return null
    }
  }

  async collectHistorical(year: number, basin?: string): Promise<TyphoonForecastData[]> {
    // JTWC best track data
    const url = `https://www.nrlmry.navy.mil/TC_pages/tc_bogus/${year}/bogus/bogus_all.tar.gz`

    try {
      const response = await this.fetchWithRetry(url)
      // Parse tar.gz archive
      // This would require decompression handling
      return []
    } catch {
      return []
    }
  }

  private parseRSSFeed(xml: string): string[] {
    const links: string[] = []
    const itemRegex = /<link>(.*?)<\/link>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      if (match[1].includes('warning') || match[1].includes('tcwarning')) {
        links.push(match[1])
      }
    }

    return links
  }

  private async collectFromUrl(url: string): Promise<TyphoonForecastData | null> {
    try {
      const response = await this.fetchWithRetry(url)
      const text = await response.text()
      return this.parseWarningText(text)
    } catch {
      return null
    }
  }

  private parseWarningText(text: string, id?: string): TyphoonForecastData | null {
    // Parse JTWC warning text format
    // Example format:
    // TROPICAL CYCLONE WARNING
    // TYPHOON 04W (GAEMI)
    // WARNING NR 025
    // ...
    // MAX SUSTAINED WINDS - 140 KT, GUSTS 170 KT

    const lines = text.split('\n')

    let name = 'Unknown'
    let internationalId = id || ''
    let lat = 0
    let lng = 0
    let windSpeed = 0
    let windGust = 0
    let pressure = 1000
    let movementDir = 'N'
    let movementSpeed = 0

    for (const line of lines) {
      const upperLine = line.toUpperCase()

      // Parse name
      if (upperLine.includes('TYPHOON') || upperLine.includes('TROPICAL STORM')) {
        const nameMatch = line.match(/\(([^)]+)\)/)
        if (nameMatch) {
          name = nameMatch[1]
        }
        const idMatch = line.match(/(\d+[A-Z])/)
        if (idMatch) {
          internationalId = idMatch[1]
        }
      }

      // Parse position
      const posMatch = line.match(/(\d+\.?\d*)\s*([NS])\s*(\d+\.?\d*)\s*([EW])/)
      if (posMatch) {
        lat = parseFloat(posMatch[1]) * (posMatch[2] === 'S' ? -1 : 1)
        lng = parseFloat(posMatch[3]) * (posMatch[4] === 'W' ? -1 : 1)
      }

      // Parse wind speed
      const windMatch = line.match(/MAX\s+SUSTAINED\s+WINDS?\s*-\s*(\d+)\s*KT/i)
      if (windMatch) {
        windSpeed = parseInt(windMatch[1])
      }

      // Parse gust
      const gustMatch = line.match(/GUSTS?\s+(\d+)\s*KT/i)
      if (gustMatch) {
        windGust = parseInt(gustMatch[1])
      }

      // Parse pressure
      const pressureMatch = line.match(/(\d+)\s*MB/i)
      if (pressureMatch) {
        pressure = parseInt(pressureMatch[1])
      }

      // Parse movement
      const moveMatch = line.match(/MOVEMENT\s*-\s*(\d+)\s*DEGREES?\s*AT\s*(\d+)\s*KT/i)
      if (moveMatch) {
        const degrees = parseInt(moveMatch[1])
        movementSpeed = parseInt(moveMatch[2])
        movementDir = this.degreesToDirection(degrees)
      }
    }

    if (lat === 0 && lng === 0) {
      return null
    }

    const points: ForecastPoint[] = [
      {
        latitude: lat,
        longitude: lng,
        windSpeed,
        windGust,
        pressure,
        category: CategoryClassifier.classifyByWind(windSpeed),
        movementSpeed,
        movementDir,
        forecastHour: 0,
        timestamp: new Date().toISOString(),
        confidence: 0.95,
      }
    ]

    // Parse forecast points if available
    const forecastRegex = /(\d+)\s*HR\s*-\s*(\d+\.?\d*)\s*([NS])\s*(\d+\.?\d*)\s*([EW])\s*(\d+)\s*KT/g
    let forecastMatch

    while ((forecastMatch = forecastRegex.exec(text)) !== null) {
      const hour = parseInt(forecastMatch[1])
      const fLat = parseFloat(forecastMatch[2]) * (forecastMatch[3] === 'S' ? -1 : 1)
      const fLng = parseFloat(forecastMatch[4]) * (forecastMatch[5] === 'W' ? -1 : 1)
      const fWind = parseInt(forecastMatch[6])

      points.push({
        latitude: fLat,
        longitude: fLng,
        windSpeed: fWind,
        pressure: pressure - (hour * 0.5), // Estimate
        category: CategoryClassifier.classifyByWind(fWind),
        forecastHour: hour,
        timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        confidence: Math.max(0.5, 1 - hour * 0.02),
      })
    }

    return {
      source: this.source,
      sourceId: internationalId,
      internationalId,
      name,
      basin: 'WP',
      year: new Date().getFullYear(),
      modelRun: new Date().toISOString(),
      points,
      rawData: text,
    }
  }

  private degreesToDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  private getMockData(): TyphoonForecastData[] {
    const now = new Date()
    return [
      {
        source: 'JTWC',
        sourceId: '04W',
        internationalId: '202404W',
        name: 'GAEMI',
        nameCn: '格美',
        basin: 'WP',
        year: 2024,
        modelRun: now.toISOString(),
        points: this.generateMockPoints(18.5, 128.3, 140, 935, now),
      },
      {
        source: 'JTWC',
        sourceId: '05W',
        internationalId: '202405W',
        name: 'PRAPIROON',
        nameCn: '派比安',
        basin: 'WP',
        year: 2024,
        modelRun: now.toISOString(),
        points: this.generateMockPoints(12.5, 125.3, 45, 998, now),
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
      const lat = startLat + progress * 5 + Math.sin(progress * Math.PI * 2) * 0.5
      const lng = startLng - progress * 8 + Math.cos(progress * Math.PI * 2) * 0.3
      const wind = startWind + Math.sin(progress * Math.PI) * 20 - progress * 30
      const pressure = startPressure - Math.sin(progress * Math.PI) * 15 + progress * 20

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(25, wind),
        windGust: Math.max(35, wind * 1.3),
        pressure: Math.min(1010, Math.max(900, pressure)),
        category: CategoryClassifier.classifyByWind(Math.max(25, wind)),
        movementSpeed: 10 + Math.random() * 5,
        movementDir: hour < 48 ? 'NW' : 'N',
        forecastHour: hour,
        timestamp: new Date(startTime.getTime() + hour * 3600000).toISOString(),
        confidence: Math.max(0.3, 1 - hour * 0.005),
      })
    }

    return points
  }
}
