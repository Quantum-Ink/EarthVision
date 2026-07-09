import { TyphoonForecastData, ForecastPoint, CategoryClassifier } from '../data-collector/base-collector'

// 融合方法枚举
export enum FusionMethod {
  WEIGHTED_MEAN = 'WEIGHTED_MEAN',
  KALMAN_FILTER = 'KALMAN_FILTER',
  PARTICLE_FILTER = 'PARTICLE_FILTER',
  GAUSSIAN_PROCESS = 'GAUSSIAN_PROCESS',
  BAYESIAN_FUSION = 'BAYESIAN_FUSION',
  ENSEMBLE_FORECAST = 'ENSEMBLE_FORECAST',
  TRAJECTORY_CLUSTERING = 'TRAJECTORY_CLUSTERING',
}

// 融合结果
export interface FusedPoint {
  latitude: number
  longitude: number
  windSpeed: number
  windGust: number
  pressure: number
  category: string
  movementSpeed: number
  movementDir: string
  forecastHour: number
  timestamp: string
  confidence: number
  variance: number
  weights: Record<string, number>
  sources: string[]
}

// 数据清洗结果
export interface CleanedData {
  points: Map<string, ForecastPoint[]>
  outliers: Map<string, ForecastPoint[]>
  duplicates: Map<string, ForecastPoint[]>
  interpolated: Map<string, ForecastPoint[]>
}

// 融合引擎
export class DataFusionEngine {
  // 权重配置
  private weights: Map<string, number> = new Map([
    ['JTWC', 0.95],
    ['CMA', 0.90],
    ['JMA', 0.92],
    ['ECMWF', 0.93],
    ['NOAA', 0.88],
  ])

  // 历史准确率
  private historicalAccuracy: Map<string, number> = new Map()

  // 数据清洗
  cleanData(data: Map<string, TyphoonForecastData>): CleanedData {
    const cleaned: CleanedData = {
      points: new Map(),
      outliers: new Map(),
      duplicates: new Map(),
      interpolated: new Map(),
    }

    for (const [source, forecast] of data) {
      const points = forecast.points

      // 1. 去除重复点
      const deduplicated = this.removeDuplicates(points)
      cleaned.duplicates.set(source, points.filter(p => !deduplicated.includes(p)))

      // 2. 检测异常值
      const { normal, outliers } = this.detectOutliers(deduplicated)
      cleaned.outliers.set(source, outliers)

      // 3. 时间统一
      const timeAligned = this.alignTimestamps(normal)

      // 4. 空间插值
      const interpolated = this.interpolatePoints(timeAligned)
      cleaned.interpolated.set(source, interpolated)

      cleaned.points.set(source, normal)
    }

    return cleaned
  }

  // 去除重复点
  private removeDuplicates(points: ForecastPoint[]): ForecastPoint[] {
    const seen = new Set<string>()
    return points.filter(p => {
      const key = `${p.forecastHour}-${p.latitude.toFixed(2)}-${p.longitude.toFixed(2)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // 检测异常值 (使用IQR方法)
  private detectOutliers(points: ForecastPoint[]): { normal: ForecastPoint[], outliers: ForecastPoint[] } {
    if (points.length < 4) return { normal: points, outliers: [] }

    const windSpeeds = points.map(p => p.windSpeed).sort((a, b) => a - b)
    const q1 = windSpeeds[Math.floor(windSpeeds.length * 0.25)]
    const q3 = windSpeeds[Math.floor(windSpeeds.length * 0.75)]
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    const normal: ForecastPoint[] = []
    const outliers: ForecastPoint[] = []

    for (const point of points) {
      if (point.windSpeed < lowerBound || point.windSpeed > upperBound) {
        outliers.push(point)
      } else {
        normal.push(point)
      }
    }

    return { normal, outliers }
  }

  // 时间统一 (插值到标准时间点)
  private alignTimestamps(points: ForecastPoint[]): ForecastPoint[] {
    // 标准时间点: 0, 6, 12, 18, 24, 36, 48, 72, 96, 120 小时
    const standardHours = [0, 6, 12, 18, 24, 36, 48, 72, 96, 120]

    const aligned: ForecastPoint[] = []

    for (const hour of standardHours) {
      // 找到最近的点
      const nearest = points.reduce((prev, curr) => {
        return Math.abs(curr.forecastHour - hour) < Math.abs(prev.forecastHour - hour) ? curr : prev
      })

      if (Math.abs(nearest.forecastHour - hour) <= 3) {
        // 线性插值
        aligned.push({
          ...nearest,
          forecastHour: hour,
          timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        })
      }
    }

    return aligned
  }

  // 空间插值
  private interpolatePoints(points: ForecastPoint[]): ForecastPoint[] {
    if (points.length < 2) return points

    const interpolated: ForecastPoint[] = [points[0]]

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]

      // 如果间隔超过12小时，插入中间点
      if (curr.forecastHour - prev.forecastHour > 12) {
        const midHour = Math.floor((prev.forecastHour + curr.forecastHour) / 2)
        const ratio = (midHour - prev.forecastHour) / (curr.forecastHour - prev.forecastHour)

        interpolated.push({
          latitude: prev.latitude + (curr.latitude - prev.latitude) * ratio,
          longitude: prev.longitude + (curr.longitude - prev.longitude) * ratio,
          windSpeed: prev.windSpeed + (curr.windSpeed - prev.windSpeed) * ratio,
          windGust: (prev.windGust || prev.windSpeed * 1.3) + ((curr.windGust || curr.windSpeed * 1.3) - (prev.windGust || prev.windSpeed * 1.3)) * ratio,
          pressure: prev.pressure + (curr.pressure - prev.pressure) * ratio,
          category: CategoryClassifier.classifyByWind(prev.windSpeed + (curr.windSpeed - prev.windSpeed) * ratio),
          movementSpeed: prev.movementSpeed || 0,
          movementDir: prev.movementDir || 'N',
          forecastHour: midHour,
          timestamp: new Date(Date.now() + midHour * 3600000).toISOString(),
          confidence: Math.min(prev.confidence || 0.5, curr.confidence || 0.5),
        })
      }

      interpolated.push(curr)
    }

    return interpolated
  }

  // 加权平均融合
  fuseWeightedMean(data: Map<string, TyphoonForecastData>): FusedPoint[] {
    const cleaned = this.cleanData(data)
    const allHours = this.getAllForecastHours(cleaned.points)
    const fused: FusedPoint[] = []

    for (const hour of allHours) {
      const hourPoints = this.getPointsAtHour(cleaned.points, hour)

      if (hourPoints.length === 0) continue

      let totalWeight = 0
      let weightedLat = 0
      let weightedLng = 0
      let weightedWind = 0
      let weightedGust = 0
      let weightedPressure = 0
      const sourceWeights: Record<string, number> = {}

      for (const [source, point] of hourPoints) {
        const weight = this.getSourceWeight(source, point.confidence || 0.5)
        totalWeight += weight

        weightedLat += point.latitude * weight
        weightedLng += point.longitude * weight
        weightedWind += point.windSpeed * weight
        weightedGust += (point.windGust || point.windSpeed * 1.3) * weight
        weightedPressure += point.pressure * weight

        sourceWeights[source] = weight
      }

      if (totalWeight > 0) {
        const lat = weightedLat / totalWeight
        const lng = weightedLng / totalWeight
        const wind = weightedWind / totalWeight
        const gust = weightedGust / totalWeight
        const pressure = weightedPressure / totalWeight

        // 计算方差
        const variance = this.calculateVariance(hourPoints, lat, lng, wind)

        fused.push({
          latitude: lat,
          longitude: lng,
          windSpeed: wind,
          windGust: gust,
          pressure,
          category: CategoryClassifier.classifyByWind(wind),
          movementSpeed: this.calculateMovementSpeed(fused, lat, lng),
          movementDir: this.calculateMovementDir(fused, lat, lng),
          forecastHour: hour,
          timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
          confidence: this.calculateConfidence(hourPoints, variance),
          variance,
          weights: sourceWeights,
          sources: Array.from(hourPoints.keys()).map(String),
        })
      }
    }

    return fused
  }

  // 卡尔曼滤波融合
  fuseKalmanFilter(data: Map<string, TyphoonForecastData>): FusedPoint[] {
    const cleaned = this.cleanData(data)
    const allHours = this.getAllForecastHours(cleaned.points)
    const fused: FusedPoint[] = []

    // 状态向量: [lat, lng, wind, pressure]
    let state = [0, 0, 0, 1000]
    let covariance = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 100, 0],
      [0, 0, 0, 100],
    ]

    // 状态转移矩阵
    const F = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0.95, 0],
      [0, 0, 0, 1.02],
    ]

    // 过程噪声
    const Q = [
      [0.01, 0, 0, 0],
      [0, 0.01, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]

    let initialized = false

    for (const hour of allHours) {
      const hourPoints = this.getPointsAtHour(cleaned.points, hour)

      if (hourPoints.length === 0) continue

      // 初始化状态
      if (!initialized) {
        const firstPoint = hourPoints[0][1]
        state = [firstPoint.latitude, firstPoint.longitude, firstPoint.windSpeed, firstPoint.pressure]
        initialized = true
      }

      // 预测步骤
      const predictedState = this.matrixVectorMultiply(F, state)
      const predictedCovariance = this.matrixAdd(
        this.matrixMultiply(this.matrixMultiply(F, covariance), this.transpose(F)),
        Q
      )

      // 更新步骤
      for (const [source, point] of hourPoints) {
        const observation = [point.latitude, point.longitude, point.windSpeed, point.pressure]
        const H = [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ]

        const R = [
          [0.1, 0, 0, 0],
          [0, 0.1, 0, 0],
          [0, 0, 10, 0],
          [0, 0, 0, 10],
        ]

        // 卡尔曼增益
        const S = this.matrixAdd(
          this.matrixMultiply(this.matrixMultiply(H, predictedCovariance), this.transpose(H)),
          R
        )
        const K = this.matrixMultiply(
          this.matrixMultiply(predictedCovariance, this.transpose(H)),
          this.invertMatrix(S)
        )

        // 状态更新
        const innovation = this.vectorSubtract(observation, this.matrixVectorMultiply(H, predictedState))
        state = this.vectorAdd(predictedState, this.matrixVectorMultiply(K, innovation))

        // 协方差更新
        const I = [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ]
        covariance = this.matrixMultiply(
          this.matrixSubtract(I, this.matrixMultiply(K, H)),
          predictedCovariance
        )
      }

      fused.push({
        latitude: state[0],
        longitude: state[1],
        windSpeed: state[2],
        windGust: state[2] * 1.3,
        pressure: state[3],
        category: CategoryClassifier.classifyByWind(state[2]),
        movementSpeed: this.calculateMovementSpeed(fused, state[0], state[1]),
        movementDir: this.calculateMovementDir(fused, state[0], state[1]),
        forecastHour: hour,
        timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        confidence: Math.max(0.5, 1 - hour * 0.003),
        variance: (covariance[0][0] + covariance[1][1]) / 2,
        weights: { KALMAN: 1 },
        sources: Array.from(hourPoints.keys()).map(String),
      })
    }

    return fused
  }

  // 贝叶斯融合
  fuseBayesian(data: Map<string, TyphoonForecastData>): FusedPoint[] {
    const cleaned = this.cleanData(data)
    const allHours = this.getAllForecastHours(cleaned.points)
    const fused: FusedPoint[] = []

    for (const hour of allHours) {
      const hourPoints = this.getPointsAtHour(cleaned.points, hour)

      if (hourPoints.length === 0) continue

      // 计算后验概率
      let totalPosterior = 0
      let weightedLat = 0
      let weightedLng = 0
      let weightedWind = 0
      let weightedPressure = 0
      const sourceWeights: Record<string, number> = {}

      for (const [source, point] of hourPoints) {
        // 先验: 基于历史准确率
        const prior = this.getSourceWeight(source, point.confidence || 0.5)

        // 似然: 基于数据一致性
        const likelihood = this.calculateLikelihood(point, hourPoints)

        // 后验
        const posterior = prior * likelihood
        totalPosterior += posterior

        weightedLat += point.latitude * posterior
        weightedLng += point.longitude * posterior
        weightedWind += point.windSpeed * posterior
        weightedPressure += point.pressure * posterior

        sourceWeights[source] = posterior
      }

      if (totalPosterior > 0) {
        const lat = weightedLat / totalPosterior
        const lng = weightedLng / totalPosterior
        const wind = weightedWind / totalPosterior
        const pressure = weightedPressure / totalPosterior
        const variance = this.calculateVariance(hourPoints, lat, lng, wind)

        fused.push({
          latitude: lat,
          longitude: lng,
          windSpeed: wind,
          windGust: wind * 1.3,
          pressure,
          category: CategoryClassifier.classifyByWind(wind),
          movementSpeed: this.calculateMovementSpeed(fused, lat, lng),
          movementDir: this.calculateMovementDir(fused, lat, lng),
          forecastHour: hour,
          timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
          confidence: this.calculateConfidence(hourPoints, variance),
          variance,
          weights: sourceWeights,
          sources: Array.from(hourPoints.keys()).map(String),
        })
      }
    }

    return fused
  }

  // 集成预报融合
  fuseEnsemble(data: Map<string, TyphoonForecastData>): FusedPoint[] {
    const cleaned = this.cleanData(data)
    const allHours = this.getAllForecastHours(cleaned.points)
    const fused: FusedPoint[] = []

    for (const hour of allHours) {
      const hourPoints = this.getPointsAtHour(cleaned.points, hour)

      if (hourPoints.length === 0) continue

      // 计算集成统计量
      const lats = hourPoints.map(([_, p]) => p.latitude)
      const lngs = hourPoints.map(([_, p]) => p.longitude)
      const winds = hourPoints.map(([_, p]) => p.windSpeed)
      const pressures = hourPoints.map(([_, p]) => p.pressure)

      const meanLat = this.mean(lats)
      const meanLng = this.mean(lngs)
      const meanWind = this.mean(winds)
      const meanPressure = this.mean(pressures)

      const spread = {
        lat: this.standardDeviation(lats),
        lng: this.standardDeviation(lngs),
        wind: this.standardDeviation(winds),
      }

      const sourceWeights: Record<string, number> = {}
      hourPoints.forEach(([source, _]) => {
        sourceWeights[source] = 1 / hourPoints.length
      })

      fused.push({
        latitude: meanLat,
        longitude: meanLng,
        windSpeed: meanWind,
        windGust: meanWind * 1.3,
        pressure: meanPressure,
        category: CategoryClassifier.classifyByWind(meanWind),
        movementSpeed: this.calculateMovementSpeed(fused, meanLat, meanLng),
        movementDir: this.calculateMovementDir(fused, meanLat, meanLng),
        forecastHour: hour,
        timestamp: new Date(Date.now() + hour * 3600000).toISOString(),
        confidence: Math.max(0.4, 1 - (spread.lat + spread.lng) * 0.1),
        variance: spread.wind,
        weights: sourceWeights,
        sources: Array.from(hourPoints.keys()).map(String),
      })
    }

    return fused
  }

  // 辅助方法
  private getAllForecastHours(data: Map<string, ForecastPoint[]>): number[] {
    const hours = new Set<number>()
    for (const points of data.values()) {
      for (const point of points) {
        hours.add(point.forecastHour)
      }
    }
    return Array.from(hours).sort((a, b) => a - b)
  }

  private getPointsAtHour(data: Map<string, ForecastPoint[]>, hour: number): [string, ForecastPoint][] {
    const result: [string, ForecastPoint][] = []
    for (const [source, points] of data) {
      const point = points.find(p => p.forecastHour === hour)
      if (point) {
        result.push([source, point])
      }
    }
    return result
  }

  private getSourceWeight(source: string, confidence: number): number {
    const baseWeight = this.weights.get(source) || 0.5
    const historicalWeight = this.historicalAccuracy.get(source) || 0.5
    return (baseWeight * 0.6 + historicalWeight * 0.2 + confidence * 0.2)
  }

  private calculateVariance(points: [string, ForecastPoint][], meanLat: number, meanLng: number, meanWind: number): number {
    if (points.length < 2) return 0

    let sumSquaredDiff = 0
    for (const [_, point] of points) {
      const latDiff = point.latitude - meanLat
      const lngDiff = point.longitude - meanLng
      const windDiff = point.windSpeed - meanWind
      sumSquaredDiff += latDiff * latDiff + lngDiff * lngDiff + (windDiff / 10) * (windDiff / 10)
    }

    return Math.sqrt(sumSquaredDiff / points.length)
  }

  private calculateConfidence(points: [string, ForecastPoint][], variance: number): number {
    const baseConfidence = 0.9
    const variancePenalty = Math.min(0.3, variance * 0.05)
    const sourceBonus = Math.min(0.1, points.length * 0.02)

    return Math.max(0.3, baseConfidence - variancePenalty + sourceBonus)
  }

  private calculateMovementSpeed(fused: FusedPoint[], lat: number, lng: number): number {
    if (fused.length === 0) return 0

    const prev = fused[fused.length - 1]
    const distance = this.haversineDistance(prev.latitude, prev.longitude, lat, lng)
    const timeDiff = 6 // 6 hours

    return distance / timeDiff
  }

  private calculateMovementDir(fused: FusedPoint[], lat: number, lng: number): string {
    if (fused.length === 0) return 'N'

    const prev = fused[fused.length - 1]
    const dLat = lat - prev.latitude
    const dLng = lng - prev.longitude
    const angle = Math.atan2(dLng, dLat) * 180 / Math.PI

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const index = Math.round(((angle + 360) % 360) / 22.5) % 16
    return directions[index]
  }

  private calculateLikelihood(point: ForecastPoint, allPoints: [string, ForecastPoint][]): number {
    const distances = allPoints
      .filter(([_, p]) => p !== point)
      .map(([_, p]) => this.haversineDistance(point.latitude, point.longitude, p.latitude, p.longitude))

    if (distances.length === 0) return 1

    const meanDistance = this.mean(distances)
    const stdDistance = this.standardDeviation(distances)

    // 一致性越高，似然越高
    return Math.exp(-meanDistance / (stdDistance + 0.1))
  }

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

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values)
    const squareDiffs = values.map(v => (v - avg) * (v - avg))
    return Math.sqrt(this.mean(squareDiffs))
  }

  // 矩阵运算
  private matrixMultiply(a: number[][], b: number[][]): number[][] {
    const result: number[][] = []
    for (let i = 0; i < a.length; i++) {
      result[i] = []
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j]
        }
        result[i][j] = sum
      }
    }
    return result
  }

  private matrixVectorMultiply(a: number[][], v: number[]): number[] {
    const result: number[] = []
    for (let i = 0; i < a.length; i++) {
      let sum = 0
      for (let j = 0; j < v.length; j++) {
        sum += a[i][j] * v[j]
      }
      result[i] = sum
    }
    return result
  }

  private matrixAdd(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]))
  }

  private matrixSubtract(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val - b[i][j]))
  }

  private transpose(m: number[][]): number[][] {
    return m[0].map((_, i) => m.map(row => row[i]))
  }

  private vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i])
  }

  private vectorSubtract(a: number[], b: number[]): number[] {
    return a.map((val, i) => val - b[i])
  }

  private invertMatrix(m: number[][]): number[][] {
    // 简化的2x2矩阵求逆
    // 对于更大的矩阵，需要使用更复杂的算法
    const n = m.length
    const augmented: number[][] = m.map((row, i) => {
      const identity = new Array(n).fill(0)
      identity[i] = 1
      return [...row, ...identity]
    })

    // 高斯消元
    for (let i = 0; i < n; i++) {
      let maxRow = i
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = j
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]

      const pivot = augmented[i][i]
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot
      }

      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = augmented[j][i]
          for (let k = i; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k]
          }
        }
      }
    }

    return augmented.map(row => row.slice(n))
  }
}

// 导出融合引擎实例
export const fusionEngine = new DataFusionEngine()
