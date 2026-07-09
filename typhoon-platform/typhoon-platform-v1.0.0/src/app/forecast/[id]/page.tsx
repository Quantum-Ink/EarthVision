'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getCategoryColor,
  getCategoryName,
  getRiskLevelColor,
  getRiskLevelName,
  formatWindSpeed,
  formatPressure,
} from '@/lib/utils'
import {
  Activity,
  Loader2,
  Download,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Wind,
  Gauge,
  Shield,
  Zap,
} from 'lucide-react'

export default function ForecastPage() {
  const params = useParams()
  const typhoonId = params.id as string

  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<any>(null)
  const [fusionMethod, setFusionMethod] = useState('WEIGHTED_MEAN')
  const [error, setError] = useState<string | null>(null)

  const runPrediction = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typhoonId,
          typhoonName: 'GAEMI',
          numSimulations: 500,
        }),
      })

      if (!response.ok) {
        throw new Error('Prediction failed')
      }

      const data = await response.json()
      setPrediction(data.data)
    } catch (err) {
      setError('预测失败，请稍后重试')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportForecast = async (format: string) => {
    if (!prediction) return

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typhoonId,
          typhoonName: 'GAEMI',
          typhoonNameCn: '格美',
          bestTrack: prediction.fusedPath,
          monteCarloResult: {
            statistics: {
              confidenceCones: prediction.probabilityCones,
              landfallProbability: prediction.landfallProbability,
              cityImpactProbability: prediction.cityImpact,
            },
          },
          aiAnalysis: prediction.aiAnalysis,
          format,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `typhoon_forecast_${typhoonId}.${format.toLowerCase()}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Activity className="h-8 w-8 text-blue-500" />
            <span>台风预测分析</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            多源数据融合 · Monte Carlo模拟 · AI智能分析
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={fusionMethod} onValueChange={setFusionMethod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择融合方法" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEIGHTED_MEAN">加权平均融合</SelectItem>
              <SelectItem value="KALMAN_FILTER">卡尔曼滤波</SelectItem>
              <SelectItem value="BAYESIAN_FUSION">贝叶斯融合</SelectItem>
              <SelectItem value="ENSEMBLE_FORECAST">集成预报</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runPrediction} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                预测中...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                运行预测
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          {error}
        </div>
      )}

      {prediction && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">数据源</p>
                    <p className="text-2xl font-bold">{prediction.metadata.sources.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">模拟次数</p>
                    <p className="text-2xl font-bold">{prediction.metadata.simulationCount}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">风险等级</p>
                    <p className="text-2xl font-bold" style={{ color: getRiskLevelColor(prediction.aiAnalysis.riskAnalysis.overallRisk) }}>
                      {getRiskLevelName(prediction.aiAnalysis.riskAnalysis.overallRisk)}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">可信度</p>
                    <p className="text-2xl font-bold">{prediction.aiAnalysis.confidenceScore}%</p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="analysis">
            <TabsList>
              <TabsTrigger value="analysis">AI分析</TabsTrigger>
              <TabsTrigger value="path">路径预测</TabsTrigger>
              <TabsTrigger value="probability">概率分析</TabsTrigger>
              <TabsTrigger value="impact">影响评估</TabsTrigger>
              <TabsTrigger value="export">导出</TabsTrigger>
            </TabsList>

            {/* AI Analysis */}
            <TabsContent value="analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <span>分析摘要</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">{prediction.aiAnalysis.summary}</pre>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <span>路径分析</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">当前移动</p>
                        <p className="font-medium">{prediction.aiAnalysis.pathAnalysis.currentMovement}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">预计路径</p>
                        <p className="font-medium">{prediction.aiAnalysis.pathAnalysis.expectedTrack}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">转向原因</p>
                        <p className="font-medium">{prediction.aiAnalysis.pathAnalysis.turnReason}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Wind className="h-5 w-5 text-orange-500" />
                        <span>强度分析</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">当前状态</p>
                        <p className="font-medium">{prediction.aiAnalysis.intensityAnalysis.currentState}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">变化趋势</p>
                        <p className="font-medium">{prediction.aiAnalysis.intensityAnalysis.expectedTrend}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">峰值强度</p>
                        <p className="font-medium">{prediction.aiAnalysis.intensityAnalysis.peakIntensity}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Path Prediction */}
            <TabsContent value="path">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span>融合路径预测</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">时效</th>
                          <th className="text-left p-2">纬度</th>
                          <th className="text-left p-2">经度</th>
                          <th className="text-left p-2">风速</th>
                          <th className="text-left p-2">气压</th>
                          <th className="text-left p-2">强度</th>
                          <th className="text-left p-2">可信度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prediction.fusedPath.slice(0, 20).map((point: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2">+{point.forecastHour}h</td>
                            <td className="p-2">{point.latitude.toFixed(1)}°N</td>
                            <td className="p-2">{point.longitude.toFixed(1)}°E</td>
                            <td className="p-2">{formatWindSpeed(point.windSpeed)}</td>
                            <td className="p-2">{formatPressure(point.pressure)}</td>
                            <td className="p-2">
                              <Badge style={{ backgroundColor: getCategoryColor(point.category), color: 'white' }}>
                                {getCategoryName(point.category)}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <Progress value={point.confidence * 100} className="h-2 w-20" />
                                <span>{(point.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Probability Analysis */}
            <TabsContent value="probability">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span>登陆概率</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {prediction.landfallProbability.length > 0 ? (
                      <div className="space-y-4">
                        {prediction.landfallProbability.slice(0, 5).map((prob: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{prob.location}</p>
                              <p className="text-sm text-muted-foreground">{prob.timeframe}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{(prob.probability * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">暂无登陆概率数据</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      <span>概率锥</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {prediction.probabilityCones.map((cone: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{(cone.probability * 100)}% 概率锥</p>
                            <p className="text-sm text-muted-foreground">
                              {cone.points.length} 个时间点
                            </p>
                          </div>
                          <Badge variant="outline">
                            {cone.points[cone.points.length - 1]?.forecastHour || 120}h
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Impact Assessment */}
            <TabsContent value="impact">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span>风险评估</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>总体风险</span>
                      <Badge style={{ backgroundColor: getRiskLevelColor(prediction.aiAnalysis.riskAnalysis.overallRisk), color: 'white' }}>
                        {getRiskLevelName(prediction.aiAnalysis.riskAnalysis.overallRisk)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">风力风险</span>
                        <Progress value={prediction.aiAnalysis.riskAnalysis.windRisk} className="h-2 w-40" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">降雨风险</span>
                        <Progress value={prediction.aiAnalysis.riskAnalysis.rainRisk} className="h-2 w-40" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">风暴潮风险</span>
                        <Progress value={prediction.aiAnalysis.riskAnalysis.stormSurgeRisk} className="h-2 w-40" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">洪涝风险</span>
                        <Progress value={prediction.aiAnalysis.riskAnalysis.floodRisk} className="h-2 w-40" />
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">影响人口</p>
                      <p className="text-2xl font-bold">{(prediction.aiAnalysis.riskAnalysis.affectedPopulation / 10000).toFixed(0)} 万</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span>城市影响</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {prediction.cityImpact.length > 0 ? (
                      <div className="space-y-3">
                        {prediction.cityImpact.slice(0, 5).map((city: any, index: number) => (
                          <div key={index} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{city.city}</span>
                              <Badge style={{ backgroundColor: getCategoryColor(city.impactLevel || 'LOW'), color: 'white' }}>
                                {city.impactLevel || 'LOW'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">预计风速</p>
                                <p>{city.estimatedWindSpeed} kt</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">预计降雨</p>
                                <p>{city.estimatedRainfall} mm</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">暂无城市影响数据</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Export */}
            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5 text-blue-500" />
                    <span>导出预报图</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={() => exportForecast('SVG')} className="h-24">
                      <div className="text-center">
                        <Download className="h-8 w-8 mx-auto mb-2" />
                        <p>SVG 矢量图</p>
                        <p className="text-xs text-muted-foreground">适合编辑和打印</p>
                      </div>
                    </Button>
                    <Button onClick={() => exportForecast('PNG')} variant="outline" className="h-24">
                      <div className="text-center">
                        <Download className="h-8 w-8 mx-auto mb-2" />
                        <p>PNG 图片</p>
                        <p className="text-xs text-muted-foreground">300dpi 高清</p>
                      </div>
                    </Button>
                    <Button onClick={() => exportForecast('PDF')} variant="outline" className="h-24">
                      <div className="text-center">
                        <Download className="h-8 w-8 mx-auto mb-2" />
                        <p>PDF 文档</p>
                        <p className="text-xs text-muted-foreground">专业报告格式</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Suggestions */}
          {prediction.aiAnalysis.suggestions && prediction.aiAnalysis.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>防灾建议</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prediction.aiAnalysis.suggestions.map((suggestion: any, index: number) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          <Badge variant={
                            suggestion.priority === 'CRITICAL' ? 'destructive' :
                            suggestion.priority === 'HIGH' ? 'default' : 'secondary'
                          }>
                            {suggestion.priority === 'CRITICAL' ? '紧急' :
                             suggestion.priority === 'HIGH' ? '高' :
                             suggestion.priority === 'MEDIUM' ? '中' : '低'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.category}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">{suggestion.description}</p>
                        <ul className="space-y-1">
                          {suggestion.actions.map((action: string, actionIndex: number) => (
                            <li key={actionIndex} className="text-sm text-muted-foreground flex items-start space-x-2">
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
        </>
      )}

      {!prediction && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">开始预测分析</h3>
              <p className="text-muted-foreground mb-4">
                点击"运行预测"按钮开始多源数据融合和AI分析
              </p>
              <Button onClick={runPrediction}>
                <Zap className="mr-2 h-4 w-4" />
                运行预测
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
