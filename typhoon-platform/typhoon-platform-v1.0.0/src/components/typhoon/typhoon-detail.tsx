'use client'

import React from 'react'
import { TyphoonData, AIAnalysis } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  getCategoryColor,
  getCategoryName,
  getRiskLevelColor,
  getRiskLevelName,
  formatWindSpeed,
  formatPressure,
  formatDate,
} from '@/lib/utils'
import { WindSpeedChart } from '@/components/charts/wind-speed-chart'
import { CategoryGauge } from '@/components/charts/category-gauge'
import { RiskMatrix } from '@/components/charts/risk-matrix'
import {
  Wind,
  Gauge,
  MapPin,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Shield,
  Droplets,
  Thermometer,
} from 'lucide-react'

interface TyphoonDetailProps {
  typhoon: TyphoonData
  analysis?: AIAnalysis
}

export function TyphoonDetail({ typhoon, analysis }: TyphoonDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <span
              className="inline-block w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: getCategoryColor(typhoon.category) }}
            />
            <span>{typhoon.name}</span>
            {typhoon.nameCn && (
              <span className="text-muted-foreground">({typhoon.nameCn})</span>
            )}
          </h1>
          {typhoon.internationalId && (
            <p className="text-muted-foreground mt-1">{typhoon.internationalId}</p>
          )}
        </div>
        <Badge
          className="text-lg px-4 py-2"
          style={{
            backgroundColor: getCategoryColor(typhoon.category),
            color: 'white',
          }}
        >
          {getCategoryName(typhoon.category)}
        </Badge>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最大风速</CardTitle>
            <Wind className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWindSpeed(typhoon.maxWindSpeed)}</div>
            <p className="text-xs text-muted-foreground">
              {formatWindSpeed(typhoon.maxWindSpeed, 'kmh')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最低气压</CardTitle>
            <Gauge className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPressure(typhoon.minPressure)}</div>
            <p className="text-xs text-muted-foreground">
              {typhoon.minPressure < 950 ? '超强台风' : typhoon.minPressure < 980 ? '强台风' : '台风'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前位置</CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typhoon.currentLat.toFixed(1)}°N
            </div>
            <p className="text-xs text-muted-foreground">
              {typhoon.currentLng.toFixed(1)}°E
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">移动信息</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typhoon.movementDir || '未知'}</div>
            <p className="text-xs text-muted-foreground">
              {typhoon.movementSpeed ? `${typhoon.movementSpeed} knots` : '速度未知'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>风速与气压变化</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typhoon.positions && typhoon.positions.length > 0 ? (
              <WindSpeedChart positions={typhoon.positions} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                暂无历史数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>强度等级</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryGauge category={typhoon.category} windSpeed={typhoon.maxWindSpeed} />
          </CardContent>
        </Card>
      </div>

      {/* Wind Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wind className="h-5 w-5" />
            <span>风圈半径</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {typhoon.radius15knots && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">15节风圈</span>
                  <span className="font-medium">{typhoon.radius15knots} km</span>
                </div>
                <Progress value={(typhoon.radius15knots / 500) * 100} className="h-2" />
              </div>
            )}
            {typhoon.radius30knots && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">30节风圈</span>
                  <span className="font-medium">{typhoon.radius30knots} km</span>
                </div>
                <Progress value={(typhoon.radius30knots / 300) * 100} className="h-2" />
              </div>
            )}
            {typhoon.radius50knots && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">50节风圈</span>
                  <span className="font-medium">{typhoon.radius50knots} km</span>
                </div>
                <Progress value={(typhoon.radius50knots / 150) * 100} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>AI分析报告</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">分析总结</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
            </div>

            <Separator />

            {/* Risk Level */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>风险等级</span>
              </h3>
              <Badge
                className="text-lg px-4 py-2"
                style={{
                  backgroundColor: getRiskLevelColor(analysis.riskLevel),
                  color: 'white',
                }}
              >
                {getRiskLevelName(analysis.riskLevel)}
              </Badge>
            </div>

            {/* Landing Probability */}
            {analysis.landingProbability && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">登陆概率</h3>
                  <div className="flex items-center space-x-4">
                    <Progress value={analysis.landingProbability.probability} className="flex-1 h-4" />
                    <span className="text-2xl font-bold">{analysis.landingProbability.probability}%</span>
                  </div>
                  {analysis.landingProbability.possibleLocations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-muted-foreground">可能登陆点：</p>
                      {analysis.landingProbability.possibleLocations.map((loc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span>{loc.location}</span>
                          <Badge variant="outline">{loc.probability}%</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* City Impact */}
            {analysis.cityImpact && analysis.cityImpact.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">城市影响分析</h3>
                  <RiskMatrix impacts={analysis.cityImpact} />
                </div>
              </>
            )}

            {/* Suggestions */}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">防灾建议</h3>
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
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>生成时间: {formatDate(typhoon.startDatetime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>最后更新: {formatDate(typhoon.lastUpdated)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
