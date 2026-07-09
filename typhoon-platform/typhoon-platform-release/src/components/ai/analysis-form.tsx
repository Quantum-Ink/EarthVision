'use client'

import React, { useState } from 'react'
import { TyphoonData, AIAnalysis } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  getCategoryColor,
  getCategoryName,
  getRiskLevelColor,
  getRiskLevelName,
} from '@/lib/utils'
import {
  Activity,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Shield,
  MapPin,
  Clock,
} from 'lucide-react'

interface AnalysisFormProps {
  typhoons: TyphoonData[]
  onAnalyze: (typhoonId: string, analysisType: string) => Promise<void>
  analysis?: AIAnalysis | null
  loading?: boolean
}

export function AnalysisForm({
  typhoons,
  onAnalyze,
  analysis,
  loading = false,
}: AnalysisFormProps) {
  const [selectedTyphoon, setSelectedTyphoon] = useState<string>('')
  const [analysisType, setAnalysisType] = useState<string>('FULL_REPORT')

  const handleAnalyze = async () => {
    if (!selectedTyphoon) return
    await onAnalyze(selectedTyphoon, analysisType)
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span>AI台风分析</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择台风</label>
              <Select value={selectedTyphoon} onValueChange={setSelectedTyphoon}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要分析的台风" />
                </SelectTrigger>
                <SelectContent>
                  {typhoons.map((typhoon) => (
                    <SelectItem key={typhoon.id} value={typhoon.id}>
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getCategoryColor(typhoon.category) }}
                        />
                        <span>{typhoon.name}</span>
                        {typhoon.nameCn && (
                          <span className="text-muted-foreground">({typhoon.nameCn})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">分析类型</label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分析类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_REPORT">完整报告</SelectItem>
                  <SelectItem value="PATH_PREDICTION">路径预测</SelectItem>
                  <SelectItem value="RISK_ASSESSMENT">风险评估</SelectItem>
                  <SelectItem value="IMPACT_ANALYSIS">影响分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!selectedTyphoon || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI分析中...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                开始分析
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span>分析结果</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {analysis.summary}
              </div>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>风险等级评估</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Badge
                  className="text-2xl px-6 py-3"
                  style={{
                    backgroundColor: getRiskLevelColor(analysis.riskLevel),
                    color: 'white',
                  }}
                >
                  {getRiskLevelName(analysis.riskLevel)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Landing Probability */}
          {analysis.landingProbability && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <span>登陆概率分析</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Progress value={analysis.landingProbability.probability} className="h-4" />
                  </div>
                  <span className="text-3xl font-bold">
                    {analysis.landingProbability.probability}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  预测时间范围: {analysis.landingProbability.timeframe}
                </p>
                {analysis.landingProbability.possibleLocations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">可能登陆点:</p>
                    {analysis.landingProbability.possibleLocations.map((loc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{loc.location}</p>
                          <p className="text-sm text-muted-foreground">
                            {loc.lat.toFixed(1)}°N, {loc.lng.toFixed(1)}°E
                          </p>
                        </div>
                        <Badge variant="outline">{loc.probability}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* City Impact */}
          {analysis.cityImpact && analysis.cityImpact.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  <span>城市影响分析</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.cityImpact.map((city, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{city.city}</h4>
                          <Badge
                            style={{
                              backgroundColor:
                                city.impactLevel === 'extreme'
                                  ? '#ef4444'
                                  : city.impactLevel === 'high'
                                  ? '#f97316'
                                  : city.impactLevel === 'moderate'
                                  ? '#eab308'
                                  : '#22c55e',
                              color: 'white',
                            }}
                          >
                            {city.impactLevel === 'extreme'
                              ? '极端'
                              : city.impactLevel === 'high'
                              ? '高'
                              : city.impactLevel === 'moderate'
                              ? '中等'
                              : '低'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {city.province}, {city.country}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">预计风速</p>
                            <p className="font-medium">{city.estimatedWindSpeed} knots</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">预计降雨</p>
                            <p className="font-medium">{city.estimatedRainfall} mm</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">影响人口</p>
                            <p className="font-medium">
                              {(city.populationAtRisk / 10000).toFixed(1)} 万
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">基础设施风险</p>
                            <p className="font-medium">{city.infrastructureRisk}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <span>防灾建议</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          <Badge
                            variant={
                              suggestion.priority === 'critical'
                                ? 'destructive'
                                : suggestion.priority === 'high'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {suggestion.priority === 'critical'
                              ? '紧急'
                              : suggestion.priority === 'high'
                              ? '高'
                              : suggestion.priority === 'medium'
                              ? '中'
                              : '低'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.category}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">{suggestion.description}</p>
                        <ul className="space-y-1">
                          {suggestion.actions.map((action, actionIndex) => (
                            <li
                              key={actionIndex}
                              className="text-sm text-muted-foreground flex items-start space-x-2"
                            >
                              <span className="text-blue-500">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamp */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>分析时间: {new Date(analysis.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
