import { FusedPoint } from '../data-fusion'

// 概率锥配置
export interface ConeConfig {
  probabilities: number[] // [0.5, 0.7, 0.9]
  numSimulations: number  // Monte Carlo 模拟次数
  timeStep: number        // 时间步长 (小时)
  maxForecastHour: number // 最大预报时效
}

// 概率锥结果
export interface ProbabilityCone {
  probability: number
  points: ConePoint[]
  polygon: GeoJSON.Polygon
}

export interface ConePoint {
  forecastHour: number
  centerLat: number
  centerLng: number
  semiMajor: number // km
  semiMinor: number // km
  orientation: number // degrees
}

// Monte Carlo 模拟结果
export interface MonteCarloResult {
  paths: SimulationPath[]
  statistics: PathStatistics
}

export interface SimulationPath {
  id: number
  points: Array<{
    latitude: number
    longitude: number
    windSpeed: number
    pressure: number
    forecastHour: number
  }>
}

export interface PathStatistics {
  meanPath: FusedPoint[]
  confidenceCones: ProbabilityCone[]
  landfallProbability: LandfallProbability[]
  cityImpactProbability: CityImpactProbability[]
}

export interface LandfallProbability {
  location: string
  lat: number
  lng: number
  probability: number
  timeframe: string
}

export interface CityImpactProbability {
  city: string
  province: string
  country: string
  lat: number
  lng: number
  probability: number
  estimatedWindSpeed: number
  estimatedRainfall: number
  populationAtRisk?: number
}

// 概率模拟引擎
export class ProbabilityEngine {
  // Monte Carlo 模拟
  async monteCarloSimulation(
    bestTrack: FusedPoint[],
    config: Partial<ConeConfig> = {}
  ): Promise<MonteCarloResult> {
    const {
      probabilities = [0.5, 0.7, 0.9],
      numSimulations = 1000,
      timeStep = 6,
      maxForecastHour = 120,
    } = config

    console.log(`Running Monte Carlo simulation with ${numSimulations} iterations...`)

    const paths: SimulationPath[] = []

    // 运行模拟
    for (let i = 0; i < numSimulations; i++) {
      const path = this.simulatePath(bestTrack, timeStep, maxForecastHour)
      paths.push({ id: i, points: path })
    }

    // 计算统计量
    const statistics = this.calculateStatistics(paths, bestTrack, probabilities, maxForecastHour)

    return { paths, statistics }
  }

  // 模拟单条路径
  private simulatePath(
    bestTrack: FusedPoint[],
    timeStep: number,
    maxForecastHour: number
  ): SimulationPath['points'] {
    const points: SimulationPath['points'] = []

    // 起始点
    const start = bestTrack[0]
    let currentLat = start.latitude
    let currentLng = start.longitude
    let currentWind = start.windSpeed
    let currentPressure = start.pressure

    // 路径参数 (带随机扰动)
    const trackError = this.generateTrackError(bestTrack)
    const intensityError = this.generateIntensityError(bestTrack)

    for (let hour = 0; hour <= maxForecastHour; hour += timeStep) {
      // 找到最佳路径对应的点
      const bestPoint = bestTrack.find(p => p.forecastHour === hour) || bestTrack[bestTrack.length - 1]

      // 添加随机扰动
      const latError = trackError.lat * Math.sqrt(hour / 24) * this.normalRandom()
      const lngError = trackError.lng * Math.sqrt(hour / 24) * this.normalRandom()
      const windError = intensityError.wind * Math.sqrt(hour / 24) * this.normalRandom()
      const pressureError = intensityError.pressure * Math.sqrt(hour / 24) * this.normalRandom()

      currentLat = bestPoint.latitude + latError
      currentLng = bestPoint.longitude + lngError
      currentWind = Math.max(15, bestPoint.windSpeed + windError)
      currentPressure = Math.min(1020, Math.max(880, bestPoint.pressure + pressureError))

      points.push({
        latitude: currentLat,
        longitude: currentLng,
        windSpeed: currentWind,
        pressure: currentPressure,
        forecastHour: hour,
      })
    }

    return points
  }

  // 生成路径误差
  private generateTrackError(bestTrack: FusedPoint[]): { lat: number; lng: number } {
    // 基于预报时效的误差模型
    const baseError = 0.5 // 度
    const hourlyGrowth = 0.02

    return {
      lat: baseError + hourlyGrowth * 24,
      lng: baseError + hourlyGrowth * 24,
    }
  }

  // 生成强度误差
  private generateIntensityError(bestTrack: FusedPoint[]): { wind: number; pressure: number } {
    return {
      wind: 10, // knots
      pressure: 5, // hPa
    }
  }

  // 正态分布随机数
  private normalRandom(): number {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  // 计算统计量
  private calculateStatistics(
    paths: SimulationPath[],
    bestTrack: FusedPoint[],
    probabilities: number[],
    maxForecastHour: number
  ): PathStatistics {
    // 计算平均路径
    const meanPath = this.calculateMeanPath(paths, maxForecastHour)

    // 计算概率锥
    const confidenceCones = this.calculateConfidenceCones(paths, probabilities, maxForecastHour)

    // 计算登陆概率
    const landfallProbability = this.calculateLandfallProbability(paths)

    // 计算城市影响概率
    const cityImpactProbability = this.calculateCityImpactProbability(paths)

    return {
      meanPath,
      confidenceCones,
      landfallProbability,
      cityImpactProbability,
    }
  }

  // 计算平均路径
  private calculateMeanPath(paths: SimulationPath[], maxForecastHour: number): FusedPoint[] {
    const meanPath: FusedPoint[] = []

    for (let hour = 0; hour <= maxForecastHour; hour += 6) {
      const hourPoints = paths
        .map(p => p.points.find(pt => pt.forecastHour === hour))
        .filter(Boolean) as SimulationPath['points']

      if (hourPoints.length === 0) continue

      const meanLat = hourPoints.reduce((sum, p) => sum + p.latitude, 0) / hourPoints.length
      const meanLng = hourPoints.reduce((sum, p) => sum + p.longitude, 0) / hourPoints.length
      const meanWind = hourPoints.reduce((sum, p) => sum + p.windSpeed, 0) / hourPoints.length
      const meanPressure = hourPoints.reduce((sum, p) => sum + p.pressure, 0) / hourPoints.length

      meanPath.push({
        latitude: meanLat,
        longitude: meanLng,
        windSpeed: meanWind,
        windGust: meanWind * 1.3,
        pressure: meanPressure,
        category: this.classifyByWind(meanWind),
        movementSpeed: 0,
        movementDir: 'N',
        forecastHour: hour,
        timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        confidence: 0.8,
        variance: 0,
        weights: {},
        sources: [],
      })
    }

    return meanPath
  }

  // 计算置信锥
  private calculateConfidenceCones(
    paths: SimulationPath[],
    probabilities: number[],
    maxForecastHour: number
  ): ProbabilityCone[] {
    const cones: ProbabilityCone[] = []

    for (const prob of probabilities) {
      const conePoints: ConePoint[] = []

      for (let hour = 0; hour <= maxForecastHour; hour += 6) {
        const hourPositions = paths
          .map(p => p.points.find(pt => pt.forecastHour === hour))
          .filter(Boolean) as SimulationPath['points']

        if (hourPositions.length === 0) continue

        // 计算百分位数
        const lats = hourPositions.map(p => p.latitude).sort((a, b) => a - b)
        const lngs = hourPositions.map(p => p.longitude).sort((a, b) => a - b)

        const lowerProb = (1 - prob) / 2
        const upperProb = 1 - lowerProb

        const latLower = lats[Math.floor(lats.length * lowerProb)]
        const latUpper = lats[Math.floor(lats.length * upperProb)]
        const lngLower = lngs[Math.floor(lngs.length * lowerProb)]
        const lngUpper = lngs[Math.floor(lngs.length * upperProb)]

        const centerLat = (latLower + latUpper) / 2
        const centerLng = (lngLower + lngUpper) / 2

        // 计算半长轴和半短轴 (km)
        const semiMajor = this.haversineDistance(centerLat, lngLower, centerLat, lngUpper) / 2
        const semiMinor = this.haversineDistance(latLower, centerLng, latUpper, centerLng) / 2

        // 计算方向角
        const orientation = Math.atan2(lngUpper - lngLower, latUpper - latLower) * 180 / Math.PI

        conePoints.push({
          forecastHour: hour,
          centerLat,
          centerLng,
          semiMajor,
          semiMinor,
          orientation,
        })
      }

      // 生成多边形
      const polygon = this.generateConePolygon(conePoints)

      cones.push({
        probability: prob,
        points: conePoints,
        polygon,
      })
    }

    return cones
  }

  // 生成锥形多边形
  private generateConePolygon(points: ConePoint[]): GeoJSON.Polygon {
    const coordinates: number[][] = []

    // 上半部分
    for (const point of points) {
      const lat = point.centerLat + (point.semiMinor / 111) * Math.cos(point.orientation * Math.PI / 180)
      const lng = point.centerLng + (point.semiMajor / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(point.orientation * Math.PI / 180)
      coordinates.push([lng, lat])
    }

    // 下半部分 (反向)
    for (const point of [...points].reverse()) {
      const lat = point.centerLat - (point.semiMinor / 111) * Math.cos(point.orientation * Math.PI / 180)
      const lng = point.centerLng - (point.semiMajor / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(point.orientation * Math.PI / 180)
      coordinates.push([lng, lat])
    }

    // 闭合多边形
    coordinates.push(coordinates[0])

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    }
  }

  // 计算登陆概率
  private calculateLandfallProbability(paths: SimulationPath[]): LandfallProbability[] {
    const landfallLocations: LandfallProbability[] = []

    // 主要沿海城市
    const coastalCities = [
      { name: '上海', lat: 31.2, lng: 121.5 },
      { name: '广州', lat: 23.1, lng: 113.3 },
      { name: '深圳', lat: 22.5, lng: 114.1 },
      { name: '厦门', lat: 24.5, lng: 118.1 },
      { name: '福州', lat: 26.1, lng: 119.3 },
      { name: '温州', lat: 28.0, lng: 120.7 },
      { name: '宁波', lat: 29.9, lng: 121.5 },
      { name: '杭州', lat: 30.3, lng: 120.2 },
      { name: '台北', lat: 25.0, lng: 121.5 },
      { name: '高雄', lat: 22.6, lng: 120.3 },
      { name: '香港', lat: 22.3, lng: 114.2 },
      { name: '澳门', lat: 22.2, lng: 113.5 },
      { name: '海口', lat: 20.0, lng: 110.4 },
      { name: '三亚', lat: 18.3, lng: 109.5 },
      { name: '东京', lat: 35.7, lng: 139.7 },
      { name: '大阪', lat: 34.7, lng: 135.5 },
      { name: '首尔', lat: 37.6, lng: 127.0 },
      { name: '釜山', lat: 35.2, lng: 129.0 },
      { name: '马尼拉', lat: 14.6, lng: 121.0 },
    ]

    for (const city of coastalCities) {
      let landfallCount = 0

      for (const path of paths) {
        // 检查路径是否经过城市附近
        const passesNear = path.points.some(point => {
          const distance = this.haversineDistance(point.latitude, point.longitude, city.lat, city.lng)
          return distance < 100 // 100km 范围内
        })

        if (passesNear) {
          landfallCount++
        }
      }

      const probability = landfallCount / paths.length

      if (probability > 0.01) { // 只记录概率大于1%的
        landfallLocations.push({
          location: city.name,
          lat: city.lat,
          lng: city.lng,
          probability,
          timeframe: '未来120小时',
        })
      }
    }

    // 按概率排序
    return landfallLocations.sort((a, b) => b.probability - a.probability)
  }

  // 计算城市影响概率
  private calculateCityImpactProbability(paths: SimulationPath[]): CityImpactProbability[] {
    const impacts: CityImpactProbability[] = []

    // 主要城市
    const majorCities = [
      { name: '上海', province: '上海', country: '中国', lat: 31.2, lng: 121.5, population: 24870000 },
      { name: '广州', province: '广东', country: '中国', lat: 23.1, lng: 113.3, population: 18680000 },
      { name: '深圳', province: '广东', country: '中国', lat: 22.5, lng: 114.1, population: 17560000 },
      { name: '厦门', province: '福建', country: '中国', lat: 24.5, lng: 118.1, population: 5160000 },
      { name: '福州', province: '福建', country: '中国', lat: 26.1, lng: 119.3, population: 8290000 },
      { name: '温州', province: '浙江', country: '中国', lat: 28.0, lng: 120.7, population: 9300000 },
      { name: '宁波', province: '浙江', country: '中国', lat: 29.9, lng: 121.5, population: 9400000 },
      { name: '台北', province: '台湾', country: '中国', lat: 25.0, lng: 121.5, population: 2650000 },
      { name: '香港', province: '香港', country: '中国', lat: 22.3, lng: 114.2, population: 7480000 },
      { name: '海口', province: '海南', country: '中国', lat: 20.0, lng: 110.4, population: 2900000 },
      { name: '东京', province: '东京都', country: '日本', lat: 35.7, lng: 139.7, population: 13960000 },
      { name: '首尔', province: '首尔', country: '韩国', lat: 37.6, lng: 127.0, population: 9780000 },
      { name: '马尼拉', province: '马尼拉', country: '菲律宾', lat: 14.6, lng: 121.0, population: 13920000 },
    ]

    for (const city of majorCities) {
      let strongWindCount = 0
      let totalWind = 0
      let totalRainfall = 0

      for (const path of paths) {
        // 找到最近的点
        const nearestPoint = path.points.reduce((nearest, point) => {
          const distance = this.haversineDistance(point.latitude, point.longitude, city.lat, city.lng)
          const nearestDistance = this.haversineDistance(nearest.latitude, nearest.longitude, city.lat, city.lng)
          return distance < nearestDistance ? point : nearest
        })

        const distance = this.haversineDistance(nearestPoint.latitude, nearestPoint.longitude, city.lat, city.lng)

        if (distance < 500) { // 500km 范围内
          // 估算影响
          const windFactor = Math.max(0, 1 - distance / 500)
          const estimatedWind = nearestPoint.windSpeed * windFactor * 0.6
          const estimatedRainfall = 50 * windFactor + Math.random() * 30

          if (estimatedWind > 34) { // 热带风暴级别
            strongWindCount++
          }

          totalWind += estimatedWind
          totalRainfall += estimatedRainfall
        }
      }

      const probability = strongWindCount / paths.length

      if (probability > 0.01) {
        impacts.push({
          city: city.name,
          province: city.province,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
          probability,
          estimatedWindSpeed: Math.round(totalWind / paths.length),
          estimatedRainfall: Math.round(totalRainfall / paths.length),
        })
      }
    }

    return impacts.sort((a, b) => b.probability - a.probability)
  }

  // Haversine 距离计算
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private classifyByWind(windSpeed: number): string {
    if (windSpeed < 34) return 'TROPICAL_DEPRESSION'
    if (windSpeed < 48) return 'TROPICAL_STORM'
    if (windSpeed < 64) return 'SEVERE_TROPICAL_STORM'
    if (windSpeed < 90) return 'TYPHOON'
    if (windSpeed < 130) return 'SEVERE_TYPHOON'
    return 'SUPER_TYPHOON'
  }

  // Bootstrap 采样
  async bootstrapSampling(
    bestTrack: FusedPoint[],
    numSamples: number = 1000
  ): Promise<MonteCarloResult> {
    const paths: SimulationPath[] = []

    for (let i = 0; i < numSamples; i++) {
      // 从历史误差分布中重采样
      const path = this.resamplePath(bestTrack)
      paths.push({ id: i, points: path })
    }

    const statistics = this.calculateStatistics(paths, bestTrack, [0.5, 0.7, 0.9], 120)

    return { paths, statistics }
  }

  private resamplePath(bestTrack: FusedPoint[]): SimulationPath['points'] {
    const points: SimulationPath['points'] = []

    for (const point of bestTrack) {
      // Bootstrap 重采样
      const lat = point.latitude + this.normalRandom() * 0.5
      const lng = point.longitude + this.normalRandom() * 0.5
      const wind = point.windSpeed + this.normalRandom() * 5
      const pressure = point.pressure + this.normalRandom() * 3

      points.push({
        latitude: lat,
        longitude: lng,
        windSpeed: Math.max(15, wind),
        pressure: Math.min(1020, Math.max(880, pressure)),
        forecastHour: point.forecastHour,
      })
    }

    return points
  }
}

// 导出概率引擎实例
export const probabilityEngine = new ProbabilityEngine()
