'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TyphoonData } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'
import { TyphoonMap } from '@/components/map/typhoon-map'
import { TyphoonList } from '@/components/typhoon/typhoon-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getCategoryColor,
  getCategoryName,
  formatWindSpeed,
  formatPressure,
} from '@/lib/utils'
import {
  Cloud,
  Wind,
  Gauge,
  MapPin,
  AlertTriangle,
  Activity,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [typhoons] = useState<TyphoonData[]>(() => generateMockTyphoonData())
  const [selectedTyphoon, setSelectedTyphoon] = useState<TyphoonData | null>(null)

  const activeTyphoons = typhoons.filter((t) => t.status === 'ACTIVE')
  const extremeTyphoons = typhoons.filter((t) => t.category === 'SUPER_TYPHOON' || t.category === 'SEVERE_TYPHOON')

  return (
    <div className="container py-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃台风</p>
                <p className="text-3xl font-bold text-blue-500">{activeTyphoons.length}</p>
              </div>
              <Cloud className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">超强台风</p>
                <p className="text-3xl font-bold text-red-500">{extremeTyphoons.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">数据源</p>
                <p className="text-3xl font-bold text-green-500">5</p>
              </div>
              <Activity className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI分析</p>
                <p className="text-3xl font-bold text-purple-500">128</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                <span>台风实时监测</span>
              </CardTitle>
              <Badge variant="outline" className="text-green-500 border-green-500">
                实时更新
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <TyphoonMap
              typhoons={typhoons}
              onTyphoonClick={(typhoon) => setSelectedTyphoon(typhoon)}
              className="h-[500px] rounded-lg overflow-hidden"
            />
          </CardContent>
        </Card>

        {/* Typhoon List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                <span>台风列表</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/data-center')}
              >
                查看全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TyphoonList typhoons={typhoons} className="h-[460px]" />
          </CardContent>
        </Card>
      </div>

      {/* Selected Typhoon Details */}
      {selectedTyphoon && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                <span
                  className="inline-block w-4 h-4 rounded-full animate-pulse"
                  style={{ backgroundColor: getCategoryColor(selectedTyphoon.category) }}
                />
                <span>{selectedTyphoon.name}</span>
                {selectedTyphoon.nameCn && (
                  <span className="text-muted-foreground">({selectedTyphoon.nameCn})</span>
                )}
                <Badge
                  style={{
                    backgroundColor: getCategoryColor(selectedTyphoon.category),
                    color: 'white',
                  }}
                >
                  {getCategoryName(selectedTyphoon.category)}
                </Badge>
              </CardTitle>
              <Button
                onClick={() => router.push(`/typhoon/${selectedTyphoon.id}`)}
              >
                查看详情
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">位置</p>
                  <p className="font-medium">
                    {selectedTyphoon.currentLat.toFixed(1)}°N, {selectedTyphoon.currentLng.toFixed(1)}°E
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Wind className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">最大风速</p>
                  <p className="font-medium">{formatWindSpeed(selectedTyphoon.maxWindSpeed)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Gauge className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">最低气压</p>
                  <p className="font-medium">{formatPressure(selectedTyphoon.minPressure)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">移动方向</p>
                  <p className="font-medium">
                    {selectedTyphoon.movementDir || '未知'}{' '}
                    {selectedTyphoon.movementSpeed ? `${selectedTyphoon.movementSpeed} kt` : ''}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-500/50"
          onClick={() => router.push('/analysis')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">AI智能分析</h3>
                <p className="text-sm text-muted-foreground">使用AI分析台风路径和风险</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-green-500/50"
          onClick={() => router.push('/data-center')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Cloud className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">数据中心</h3>
                <p className="text-sm text-muted-foreground">查看历史台风数据和统计</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50"
          onClick={() => router.push('/admin')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">管理后台</h3>
                <p className="text-sm text-muted-foreground">系统管理和数据同步</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
