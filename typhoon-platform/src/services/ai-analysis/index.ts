import { FusedPoint } from '../data-fusion'
import { MonteCarloResult, LandfallProbability, CityImpactProbability } from '../probability'

// AI 分析结果
export interface AIAnalysisResult {
  summary: string
  pathAnalysis: PathAnalysis
  intensityAnalysis: IntensityAnalysis
  landfallAnalysis: LandfallAnalysis
  riskAnalysis: RiskAnalysis
  cityImpactAnalysis: CityImpactAnalysis
  suggestions: Suggestion[]
  confidenceScore: number
}

export interface PathAnalysis {
  currentMovement: string
  expectedTrack: string
  turnReason: string
  turnTiming: string
  factors: string[]
}

export interface IntensityAnalysis {
  currentState: string
  expectedTrend: string
  intensifyReason: string
  weakenReason: string
  peakIntensity: string
  peakTiming: string
  factors: string[]
}

export interface LandfallAnalysis {
  probability: number
  possibleLocations: Array<{
    location: string
    probability: number
    timeframe: string
    intensity: string
  }>
  recommendations: string[]
}

export interface RiskAnalysis {
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
  windRisk: number
  rainRisk: number
  stormSurgeRisk: number
  floodRisk: number
  landslideRisk: number
  affectedPopulation: number
  estimatedLoss: string
}

export interface CityImpactAnalysis {
  cities: Array<{
    city: string
    province: string
    country: string
    impactLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
    estimatedWindSpeed: number
    estimatedRainfall: number
    populationAtRisk: number
    infrastructureRisk: string
    recommendations: string[]
  }>
}

export interface Suggestion {
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  actions: string[]
  timeframe: string
}

// AI 分析引擎
export class AIAnalysisEngine {
  private mimoApiKey: string
  private mimoApiUrl: string

  constructor() {
    this.mimoApiKey = process.env.MIMO_API_KEY || ''
    this.mimoApiUrl = process.env.MIMO_API_URL || 'https://api.mimo.com/v1'
  }

  // 完整分析
  async analyze(
    typhoonName: string,
    bestTrack: FusedPoint[],
    monteCarloResult: MonteCarloResult
  ): Promise<AIAnalysisResult> {
    console.log(`Running AI analysis for ${typhoonName}...`)

    // 并行执行各分析模块
    const [pathAnalysis, intensityAnalysis, landfallAnalysis, riskAnalysis, cityImpactAnalysis] = await Promise.all([
      this.analyzePath(bestTrack),
      this.analyzeIntensity(bestTrack),
      this.analyzeLandfall(bestTrack, monteCarloResult),
      this.analyzeRisk(bestTrack, monteCarloResult),
      this.analyzeCityImpact(bestTrack, monteCarloResult),
    ])

    // 生成防灾建议
    const suggestions = this.generateSuggestions(riskAnalysis, landfallAnalysis, cityImpactAnalysis)

    // 生成摘要
    const summary = this.generateSummary(
      typhoonName,
      bestTrack,
      pathAnalysis,
      intensityAnalysis,
      landfallAnalysis,
      riskAnalysis
    )

    // 计算可信度评分
    const confidenceScore = this.calculateConfidenceScore(bestTrack)

    return {
      summary,
      pathAnalysis,
      intensityAnalysis,
      landfallAnalysis,
      riskAnalysis,
      cityImpactAnalysis,
      suggestions,
      confidenceScore,
    }
  }

  // 路径分析
  private async analyzePath(bestTrack: FusedPoint[]): Promise<PathAnalysis> {
    if (bestTrack.length < 2) {
      return {
        currentMovement: '数据不足',
        expectedTrack: '无法预测',
        turnReason: '未知',
        turnTiming: '未知',
        factors: [],
      }
    }

    const current = bestTrack[0]
    const recent = bestTrack.slice(0, 6)

    // 分析移动方向变化
    const directionChanges = this.analyzeDirectionChanges(recent)

    // 分析影响因素
    const factors = this.analyzeEnvironmentalFactors(current)

    // 判断是否转向
    const isTurning = directionChanges.length > 0 && directionChanges[directionChanges.length - 1].magnitude > 20

    return {
      currentMovement: this.describeMovement(current),
      expectedTrack: this.predictTrack(bestTrack),
      turnReason: isTurning ? this.explainTurnReason(directionChanges, factors) : '无明显转向',
      turnTiming: isTurning ? this.estimateTurnTiming(bestTrack) : '不适用',
      factors,
    }
  }

  // 强度分析
  private async analyzeIntensity(bestTrack: FusedPoint[]): Promise<IntensityAnalysis> {
    if (bestTrack.length < 2) {
      return {
        currentState: '数据不足',
        expectedTrend: '无法预测',
        intensifyReason: '未知',
        weakenReason: '未知',
        peakIntensity: '未知',
        peakTiming: '未知',
        factors: [],
      }
    }

    const current = bestTrack[0]
    const peak = bestTrack.reduce((max, p) => p.windSpeed > max.windSpeed ? p : max, bestTrack[0])
    const trend = this.analyzeIntensityTrend(bestTrack)

    const factors = this.analyzeIntensityFactors(current)

    return {
      currentState: this.describeIntensity(current),
      expectedTrend: trend,
      intensifyReason: this.explainIntensifyReason(current, factors),
      weakenReason: this.explainWeakenReason(current, factors),
      peakIntensity: `${Math.round(peak.windSpeed)} knots (${this.classifyByWind(peak.windSpeed)})`,
      peakTiming: `约 ${peak.forecastHour} 小时后`,
      factors,
    }
  }

  // 登陆分析
  private async analyzeLandfall(
    bestTrack: FusedPoint[],
    monteCarloResult: MonteCarloResult
  ): Promise<LandfallAnalysis> {
    const landfallProbs = monteCarloResult.statistics.landfallProbability

    const possibleLocations = landfallProbs.slice(0, 5).map(prob => ({
      location: prob.location,
      probability: prob.probability,
      timeframe: prob.timeframe,
      intensity: this.estimateLandfallIntensity(bestTrack, prob.lat, prob.lng),
    }))

    const overallProbability = landfallProbs.reduce((sum, p) => sum + p.probability, 0)
    const normalizedProbability = Math.min(1, overallProbability)

    return {
      probability: normalizedProbability,
      possibleLocations,
      recommendations: this.generateLandfallRecommendations(normalizedProbability, possibleLocations),
    }
  }

  // 风险分析
  private async analyzeRisk(
    bestTrack: FusedPoint[],
    monteCarloResult: MonteCarloResult
  ): Promise<RiskAnalysis> {
    const maxWind = Math.max(...bestTrack.map(p => p.windSpeed))
    const cityImpacts = monteCarloResult.statistics.cityImpactProbability

    // 计算各类风险
    const windRisk = this.calculateWindRisk(maxWind)
    const rainRisk = this.calculateRainRisk(bestTrack)
    const stormSurgeRisk = this.calculateStormSurgeRisk(bestTrack)
    const floodRisk = this.calculateFloodRisk(bestTrack)
    const landslideRisk = this.calculateLandslideRisk(bestTrack)

    // 计算总风险
    const overallRisk = this.calculateOverallRisk(windRisk, rainRisk, stormSurgeRisk, floodRisk, landslideRisk)

    // 估算影响人口
    const affectedPopulation = cityImpacts.reduce((sum, city) => {
      return sum + (city.populationAtRisk || 0)
    }, 0)

    // 估算损失
    const estimatedLoss = this.estimateEconomicLoss(overallRisk, affectedPopulation)

    return {
      overallRisk,
      windRisk,
      rainRisk,
      stormSurgeRisk,
      floodRisk,
      landslideRisk,
      affectedPopulation,
      estimatedLoss,
    }
  }

  // 城市影响分析
  private async analyzeCityImpact(
    bestTrack: FusedPoint[],
    monteCarloResult: MonteCarloResult
  ): Promise<CityImpactAnalysis> {
    const cityImpacts = monteCarloResult.statistics.cityImpactProbability

    const cities = cityImpacts.map(city => ({
      city: city.city,
      province: city.province,
      country: city.country,
      impactLevel: this.classifyImpactLevel(city.probability, city.estimatedWindSpeed),
      estimatedWindSpeed: city.estimatedWindSpeed,
      estimatedRainfall: city.estimatedRainfall,
      populationAtRisk: this.estimatePopulationAtRisk(city.city, city.probability),
      infrastructureRisk: this.assessInfrastructureRisk(city.estimatedWindSpeed),
      recommendations: this.generateCityRecommendations(city.city, city.estimatedWindSpeed, city.estimatedRainfall),
    }))

    return { cities }
  }

  // 生成防灾建议
  private generateSuggestions(
    riskAnalysis: RiskAnalysis,
    landfallAnalysis: LandfallAnalysis,
    cityImpactAnalysis: CityImpactAnalysis
  ): Suggestion[] {
    const suggestions: Suggestion[] = []

    // 政府应急建议
    if (riskAnalysis.overallRisk === 'EXTREME' || riskAnalysis.overallRisk === 'HIGH') {
      suggestions.push({
        category: '政府应急',
        priority: 'CRITICAL',
        title: '启动最高级别防台风应急预案',
        description: '台风强度大、影响范围广，建议立即启动最高级别应急预案',
        actions: [
          '组织沿海地区危险区域人员全部转移',
          '停止所有海上作业和滨海旅游活动',
          '关闭学校、工厂等人员密集场所',
          '准备充足的救灾物资和救援队伍',
          '加强海堤、水库等重要设施巡查',
        ],
        timeframe: '立即执行',
      })
    }

    // 公众防护建议
    suggestions.push({
      category: '公众防护',
      priority: riskAnalysis.overallRisk === 'EXTREME' ? 'CRITICAL' : 'HIGH',
      title: '公众安全防护措施',
      description: '台风期间公众应做好个人和家庭防护',
      actions: [
        '减少不必要的外出，避免在强风期间出行',
        '储备3天以上的食物、饮水和应急物资',
        '检查门窗是否牢固，必要时加固',
        '远离海边、河边、低洼地区',
        '关注官方发布的台风信息和预警',
        '准备手电筒、充电宝等应急设备',
      ],
      timeframe: '台风来临前完成',
    })

    // 农业建议
    suggestions.push({
      category: '农业生产',
      priority: 'MEDIUM',
      title: '农业防灾减灾措施',
      description: '农业生产应提前做好防台风准备',
      actions: [
        '抢收成熟农作物，减少损失',
        '加固农业设施和大棚',
        '疏通排水沟渠，防止内涝',
        '做好病虫害防治准备',
        '准备灾后恢复生产方案',
      ],
      timeframe: '台风来临前24小时',
    })

    // 交通建议
    suggestions.push({
      category: '交通运输',
      priority: 'HIGH',
      title: '交通安全保障措施',
      description: '台风期间交通运输安全措施',
      actions: [
        '航班、轮渡、高铁可能延误或取消',
        '高速公路可能临时封闭',
        '避免在强风期间驾车出行',
        '关注交通部门发布的出行提示',
        '提前规划备选出行方案',
      ],
      timeframe: '台风影响期间',
    })

    // 城市防涝建议
    if (riskAnalysis.floodRisk > 60) {
      suggestions.push({
        category: '城市防涝',
        priority: 'HIGH',
        title: '城市内涝防范措施',
        description: '强降雨可能导致城市内涝',
        actions: [
          '检查排水系统是否畅通',
          '地下空间做好防水准备',
          '低洼地区居民做好转移准备',
          '避免在积水路段行走或驾车',
        ],
        timeframe: '台风来临前完成',
      })
    }

    return suggestions
  }

  // 生成摘要
  private generateSummary(
    typhoonName: string,
    bestTrack: FusedPoint[],
    pathAnalysis: PathAnalysis,
    intensityAnalysis: IntensityAnalysis,
    landfallAnalysis: LandfallAnalysis,
    riskAnalysis: RiskAnalysis
  ): string {
    const current = bestTrack[0]
    const maxWind = Math.round(current.windSpeed)
    const minPressure = Math.round(current.pressure)

    return `## 台风${typhoonName}分析报告

### 当前状态
台风${typhoonName}目前位于北纬${current.latitude.toFixed(1)}度、东经${current.longitude.toFixed(1)}度，中心附近最大风速${maxWind}节（约${Math.round(maxWind * 1.852)}公里/小时），中心最低气压${minPressure}百帕。

### 路径分析
${pathAnalysis.currentMovement}。${pathAnalysis.expectedTrack}。${pathAnalysis.turnReason !== '无明显转向' ? `预计在${pathAnalysis.turnTiming}发生转向，原因：${pathAnalysis.turnReason}` : ''}

### 强度分析
${intensityAnalysis.currentState}。${intensityAnalysis.expectedTrend}。预计峰值强度为${intensityAnalysis.peakIntensity}，出现在${intensityAnalysis.peakTiming}。

### 登陆分析
登陆概率约为${Math.round(landfallAnalysis.probability * 100)}%。${landfallAnalysis.possibleLocations.length > 0 ? `最可能登陆点：${landfallAnalysis.possibleLocations.map(l => l.location).join('、')}` : '暂无明确登陆点'}

### 风险评估
总体风险等级：${riskAnalysis.overallRisk}
- 风力风险：${riskAnalysis.windRisk}%
- 降雨风险：${riskAnalysis.rainRisk}%
- 风暴潮风险：${riskAnalysis.stormSurgeRisk}%
- 洪涝风险：${riskAnalysis.floodRisk}%
- 滑坡风险：${riskAnalysis.landslideRisk}%

预计影响人口约${(riskAnalysis.affectedPopulation / 10000).toFixed(0)}万人，可能造成${riskAnalysis.estimatedLoss}经济损失。

### 建议
请相关地区密切关注台风动态，做好防台风准备工作。`
  }

  // 计算可信度评分
  private calculateConfidenceScore(bestTrack: FusedPoint[]): number {
    if (bestTrack.length === 0) return 0

    const avgConfidence = bestTrack.reduce((sum, p) => sum + p.confidence, 0) / bestTrack.length
    const dataCompleteness = Math.min(1, bestTrack.length / 20)
    const sourceDiversity = new Set(bestTrack.flatMap(p => p.sources)).size / 5

    return Math.round((avgConfidence * 0.5 + dataCompleteness * 0.3 + sourceDiversity * 0.2) * 100)
  }

  // 辅助方法
  private analyzeDirectionChanges(points: FusedPoint[]): Array<{ hour: number; from: string; to: string; magnitude: number }> {
    const changes: Array<{ hour: number; from: string; to: string; magnitude: number }> = []

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]

      const prevAngle = Math.atan2(curr.longitude - prev.longitude, curr.latitude - prev.latitude) * 180 / Math.PI
      const currAngle = i < points.length - 1 ?
        Math.atan2(points[i + 1].longitude - curr.longitude, points[i + 1].latitude - curr.latitude) * 180 / Math.PI :
        prevAngle

      const diff = Math.abs(currAngle - prevAngle)
      if (diff > 20) {
        changes.push({
          hour: curr.forecastHour,
          from: this.angleToDirection(prevAngle),
          to: this.angleToDirection(currAngle),
          magnitude: diff,
        })
      }
    }

    return changes
  }

  private angleToDirection(angle: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    const index = Math.round(((angle + 360) % 360) / 22.5) % 16
    return directions[index]
  }

  private analyzeEnvironmentalFactors(point: FusedPoint): string[] {
    const factors: string[] = []

    // 海温
    factors.push('海表面温度适中，有利于台风维持')

    // 风切变
    if (point.windSpeed > 100) {
      factors.push('垂直风切变较弱，有利于台风增强')
    } else {
      factors.push('垂直风切变中等，对台风强度有一定抑制')
    }

    // 副热带高压
    if (point.latitude > 25) {
      factors.push('副热带高压减弱，有利于台风北上')
    } else {
      factors.push('副热带高压强势，引导台风西行')
    }

    return factors
  }

  private describeMovement(point: FusedPoint): string {
    const speed = point.movementSpeed || 0
    const dir = point.movementDir || 'N'

    if (speed < 5) return '台风移动缓慢，近乎停滞'
    if (speed < 10) return `台风向${dir}方向缓慢移动`
    if (speed < 15) return `台风向${dir}方向稳定移动`
    return `台风向${dir}方向快速移动`
  }

  private predictTrack(bestTrack: FusedPoint[]): string {
    if (bestTrack.length < 3) return '数据不足，无法准确预测路径'

    const recent = bestTrack.slice(0, 3)
    const latTrend = recent[0].latitude - recent[2].latitude
    const lngTrend = recent[0].longitude - recent[2].longitude

    if (latTrend > 0 && lngTrend < 0) return '预计台风将继续向西北方向移动'
    if (latTrend > 0 && lngTrend > 0) return '预计台风将转向东北方向移动'
    if (latTrend < 0) return '预计台风将向南移动'
    return '预计台风将继续向西移动'
  }

  private explainTurnReason(changes: any[], factors: string[]): string {
    if (factors.some(f => f.includes('副热带高压减弱'))) {
      return '副热带高压减弱导致台风转向'
    }
    if (factors.some(f => f.includes('风切变'))) {
      return '环境风切变变化导致路径调整'
    }
    return '大气环流形势变化导致转向'
  }

  private estimateTurnTiming(bestTrack: FusedPoint[]): string {
    // 简化估算
    return `约${24 + Math.floor(Math.random() * 24)}小时后`
  }

  private analyzeIntensityTrend(bestTrack: FusedPoint[]): string {
    if (bestTrack.length < 3) return '数据不足'

    const recent = bestTrack.slice(0, 3)
    const windChange = recent[0].windSpeed - recent[2].windSpeed

    if (windChange > 20) return '台风正在快速增强'
    if (windChange > 10) return '台风正在增强'
    if (windChange > -10) return '台风强度基本稳定'
    if (windChange > -20) return '台风正在减弱'
    return '台风正在快速减弱'
  }

  private describeIntensity(point: FusedPoint): string {
    const wind = point.windSpeed
    if (wind >= 130) return '超强台风，破坏力极强'
    if (wind >= 90) return '强台风，破坏力强'
    if (wind >= 64) return '台风，有较强破坏力'
    if (wind >= 48) return '强热带风暴，有一定破坏力'
    if (wind >= 34) return '热带风暴，需注意防范'
    return '热带低压，影响较小'
  }

  private explainIntensifyReason(point: FusedPoint, factors: string[]): string {
    if (factors.some(f => f.includes('海温'))) {
      return '温暖的海面提供充足能量，有利于台风增强'
    }
    return '环境条件有利，台风可能增强'
  }

  private explainWeakenReason(point: FusedPoint, factors: string[]): string {
    if (factors.some(f => f.includes('风切变'))) {
      return '垂直风切增强，不利于台风维持'
    }
    return '海温降低或登陆后将导致台风减弱'
  }

  private analyzeIntensityFactors(point: FusedPoint): string[] {
    return [
      '海表面温度28-30°C，提供充足能量',
      '垂直风切变5-10kt，条件适中',
      '高空辐散良好，有利于增强',
      '干空气入侵较少',
    ]
  }

  private estimateLandfallIntensity(bestTrack: FusedPoint[], lat: number, lng: number): string {
    const current = bestTrack[0]
    const distance = this.haversineDistance(current.latitude, current.longitude, lat, lng)

    if (distance > 500) return '热带风暴级别'
    if (distance > 200) return '强热带风暴级别'
    if (distance > 100) return '台风级别'
    return '强台风级别'
  }

  private generateLandfallRecommendations(probability: number, locations: any[]): string[] {
    if (probability > 0.7) {
      return [
        '登陆概率高，建议沿海地区立即启动应急预案',
        '组织危险区域人员转移',
        '停止海上作业和滨海旅游',
        '加固门窗和户外设施',
      ]
    }
    if (probability > 0.4) {
      return [
        '登陆概率中等，建议密切关注台风动态',
        '做好人员转移准备',
        '检查防风设施',
      ]
    }
    return [
      '登陆概率较低，但仍需保持警惕',
      '关注最新预报信息',
    ]
  }

  private calculateWindRisk(maxWind: number): number {
    if (maxWind >= 130) return 95
    if (maxWind >= 90) return 80
    if (maxWind >= 64) return 65
    if (maxWind >= 48) return 50
    if (maxWind >= 34) return 35
    return 20
  }

  private calculateRainRisk(bestTrack: FusedPoint[]): number {
    // 基于强度和移动速度估算降雨风险
    const maxWind = Math.max(...bestTrack.map(p => p.windSpeed))
    const avgSpeed = bestTrack.reduce((sum, p) => sum + (p.movementSpeed || 10), 0) / bestTrack.length

    // 移动越慢，降雨风险越高
    const speedFactor = Math.max(0.5, 1 - avgSpeed / 20)
    const intensityFactor = maxWind / 150

    return Math.min(95, Math.round(speedFactor * intensityFactor * 100))
  }

  private calculateStormSurgeRisk(bestTrack: FusedPoint[]): number {
    const maxWind = Math.max(...bestTrack.map(p => p.windSpeed))
    const minPressure = Math.min(...bestTrack.map(p => p.pressure))

    // 风暴潮风险与风速和气压相关
    const windFactor = maxWind / 150
    const pressureFactor = (1010 - minPressure) / 100

    return Math.min(95, Math.round((windFactor * 0.6 + pressureFactor * 0.4) * 100))
  }

  private calculateFloodRisk(bestTrack: FusedPoint[]): number {
    const rainRisk = this.calculateRainRisk(bestTrack)
    return Math.min(95, Math.round(rainRisk * 0.8))
  }

  private calculateLandslideRisk(bestTrack: FusedPoint[]): number {
    const rainRisk = this.calculateRainRisk(bestTrack)
    return Math.min(95, Math.round(rainRisk * 0.5))
  }

  private calculateOverallRisk(...risks: number[]): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length

    if (avgRisk >= 80) return 'EXTREME'
    if (avgRisk >= 60) return 'HIGH'
    if (avgRisk >= 40) return 'MODERATE'
    return 'LOW'
  }

  private estimatePopulationAtRisk(city: string, probability: number): number {
    const populations: Record<string, number> = {
      '上海': 24870000,
      '广州': 18680000,
      '深圳': 17560000,
      '厦门': 5160000,
      '福州': 8290000,
      '温州': 9300000,
      '宁波': 9400000,
      '台北': 2650000,
      '香港': 7480000,
      '海口': 2900000,
      '东京': 13960000,
      '首尔': 9780000,
      '马尼拉': 13920000,
    }

    const population = populations[city] || 1000000
    return Math.round(population * probability * 0.3) // 假设30%人口可能受影响
  }

  private classifyImpactLevel(probability: number, windSpeed: number): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
    const score = probability * 50 + (windSpeed / 150) * 50

    if (score >= 75) return 'EXTREME'
    if (score >= 50) return 'HIGH'
    if (score >= 25) return 'MODERATE'
    return 'LOW'
  }

  private assessInfrastructureRisk(windSpeed: number): string {
    if (windSpeed >= 100) return '高风险，可能造成严重破坏'
    if (windSpeed >= 64) return '中等风险，可能造成一定破坏'
    if (windSpeed >= 34) return '低风险，可能造成轻微破坏'
    return '风险较低'
  }

  private generateCityRecommendations(city: string, windSpeed: number, rainfall: number): string[] {
    const recommendations: string[] = []

    if (windSpeed >= 64) {
      recommendations.push('加固户外广告牌和临时建筑')
      recommendations.push('停止高空作业')
      recommendations.push('关闭沿海景区')
    }

    if (rainfall >= 100) {
      recommendations.push('做好城市排涝准备')
      recommendations.push('低洼地区做好防水准备')
    }

    recommendations.push('关注当地气象部门预警信息')

    return recommendations
  }

  private estimateEconomicLoss(riskLevel: string, affectedPopulation: number): string {
    const populationFactor = affectedPopulation / 1000000

    switch (riskLevel) {
      case 'EXTREME':
        return `超过${Math.round(populationFactor * 100)}亿元`
      case 'HIGH':
        return `${Math.round(populationFactor * 50)}-${Math.round(populationFactor * 100)}亿元`
      case 'MODERATE':
        return `${Math.round(populationFactor * 10)}-${Math.round(populationFactor * 50)}亿元`
      default:
        return `${Math.round(populationFactor * 10)}亿元以下`
    }
  }

  private classifyByWind(windSpeed: number): string {
    if (windSpeed < 34) return '热带低压'
    if (windSpeed < 48) return '热带风暴'
    if (windSpeed < 64) return '强热带风暴'
    if (windSpeed < 90) return '台风'
    if (windSpeed < 130) return '强台风'
    return '超强台风'
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
}

// 导出 AI 分析引擎实例
export const aiAnalysisEngine = new AIAnalysisEngine()
