'use client'

import React from 'react'
import Link from 'next/link'
import { TyphoonData } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getCategoryColor,
  getCategoryName,
  formatWindSpeed,
  formatPressure,
  formatDate,
} from '@/lib/utils'
import {
  Wind,
  Gauge,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

interface TyphoonCardProps {
  typhoon: TyphoonData
}

export function TyphoonCard({ typhoon }: TyphoonCardProps) {
  return (
    <Link href={`/typhoon/${typhoon.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300 hover:border-blue-500/50 cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <span
                className="inline-block w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: getCategoryColor(typhoon.category) }}
              />
              <span>{typhoon.name}</span>
              {typhoon.nameCn && (
                <span className="text-muted-foreground">({typhoon.nameCn})</span>
              )}
            </CardTitle>
            <Badge
              style={{
                backgroundColor: getCategoryColor(typhoon.category),
                color: 'white',
              }}
            >
              {getCategoryName(typhoon.category)}
            </Badge>
          </div>
          {typhoon.internationalId && (
            <p className="text-sm text-muted-foreground">{typhoon.internationalId}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">位置</p>
                <p className="text-sm font-medium">
                  {typhoon.currentLat.toFixed(1)}°N, {typhoon.currentLng.toFixed(1)}°E
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">最大风速</p>
                <p className="text-sm font-medium">{formatWindSpeed(typhoon.maxWindSpeed)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">最低气压</p>
                <p className="text-sm font-medium">{formatPressure(typhoon.minPressure)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">移动方向</p>
                <p className="text-sm font-medium">
                  {typhoon.movementDir || '未知'}{' '}
                  {typhoon.movementSpeed ? `${typhoon.movementSpeed} kt` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>更新于 {formatDate(typhoon.lastUpdated)}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
