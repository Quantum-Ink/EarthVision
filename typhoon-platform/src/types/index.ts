export interface TyphoonData {
  id: string
  name: string
  nameCn?: string
  internationalId?: string
  basin: string
  year: number
  category: TyphoonCategory
  status: TyphoonStatus
  currentLat: number
  currentLng: number
  maxWindSpeed: number
  minPressure: number
  movementSpeed?: number
  movementDir?: string
  radius15knots?: number
  radius30knots?: number
  radius50knots?: number
  startDatetime: string
  endDatetime?: string
  lastUpdated: string
  dataSource: string
  description?: string
  positions?: TyphoonPosition[]
  forecasts?: TyphoonForecast[]
  aiAnalyses?: AIAnalysis[]
  impacts?: TyphoonImpact[]
}

export interface TyphoonPosition {
  id: string
  typhoonId: string
  latitude: number
  longitude: number
  windSpeed: number
  pressure: number
  category: TyphoonCategory
  timestamp: string
  movementSpeed?: number
  movementDir?: string
  radius15knots?: number
  radius30knots?: number
  radius50knots?: number
}

export interface TyphoonForecast {
  id: string
  typhoonId: string
  source: string
  forecastTime: string
  latitude: number
  longitude: number
  windSpeed: number
  pressure: number
  category: TyphoonCategory
  confidence?: number
}

export interface AIAnalysis {
  id: string
  typhoonId: string
  analysisType: AnalysisType
  summary: string
  pathPrediction?: PathPrediction
  landingProbability?: LandingProbability
  cityImpact?: CityImpact[]
  riskLevel: RiskLevel
  suggestions?: Suggestion[]
  rawData?: any
  modelVersion?: string
  createdAt: string
}

export interface PathPrediction {
  points: Array<{
    lat: number
    lng: number
    time: string
    confidence: number
  }>
  trend: 'north' | 'south' | 'east' | 'west' | 'stationary'
  speed: number
}

export interface LandingProbability {
  probability: number
  possibleLocations: Array<{
    location: string
    lat: number
    lng: number
    probability: number
  }>
  timeframe: string
}

export interface CityImpact {
  city: string
  province: string
  country: string
  lat: number
  lng: number
  impactLevel: 'low' | 'moderate' | 'high' | 'extreme'
  estimatedWindSpeed: number
  estimatedRainfall: number
  populationAtRisk: number
  infrastructureRisk: string
}

export interface Suggestion {
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  actions: string[]
}

export interface TyphoonImpact {
  id: string
  typhoonId: string
  region: string
  country: string
  city?: string
  impactType: string
  severity: number
  description?: string
  estimatedLoss?: number
  affectedPeople?: number
  startTime: string
  endTime?: string
}

export type TyphoonCategory =
  | 'TROPICAL_DEPRESSION'
  | 'TROPICAL_STORM'
  | 'SEVERE_TROPICAL_STORM'
  | 'TYPHOON'
  | 'SEVERE_TYPHOON'
  | 'SUPER_TYPHOON'

export type TyphoonStatus =
  | 'ACTIVE'
  | 'DISSIPATED'
  | 'EXTRATROPICAL'
  | 'REMNANT'

export type AnalysisType =
  | 'PATH_PREDICTION'
  | 'RISK_ASSESSMENT'
  | 'IMPACT_ANALYSIS'
  | 'FULL_REPORT'

export type RiskLevel =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'EXTREME'

export interface DataSource {
  id: string
  name: string
  url: string
  lastSync?: string
  syncStatus: SyncStatus
  errorMessage?: string
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'

export interface AIUsageLog {
  id: string
  userId?: string
  analysisType: AnalysisType
  typhoonId?: string
  inputTokens: number
  outputTokens: number
  cost?: number
  modelVersion: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  lastLogin?: string
  createdAt: string
}

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER'

export interface MapConfig {
  center: [number, number]
  zoom: number
  style: string
}

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
  }>
}
