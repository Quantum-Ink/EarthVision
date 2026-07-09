'use client'

import React from 'react'
import ReactECharts from 'echarts-for-react'
import { TyphoonCategory } from '@/types'

interface CategoryGaugeProps {
  category: TyphoonCategory
  windSpeed: number
  className?: string
}

export function CategoryGauge({ category, windSpeed, className = '' }: CategoryGaugeProps) {
  const getCategoryValue = (category: TyphoonCategory): number => {
    const values: Record<TyphoonCategory, number> = {
      TROPICAL_DEPRESSION: 1,
      TROPICAL_STORM: 2,
      SEVERE_TROPICAL_STORM: 3,
      TYPHOON: 4,
      SEVERE_TYPHOON: 5,
      SUPER_TYPHOON: 6,
    }
    return values[category] || 0
  }

  const getCategoryName = (category: TyphoonCategory): string => {
    const names: Record<TyphoonCategory, string> = {
      TROPICAL_DEPRESSION: '热带低压',
      TROPICAL_STORM: '热带风暴',
      SEVERE_TROPICAL_STORM: '强热带风暴',
      TYPHOON: '台风',
      SEVERE_TYPHOON: '强台风',
      SUPER_TYPHOON: '超强台风',
    }
    return names[category] || '未知'
  }

  const getCategoryColor = (category: TyphoonCategory): string => {
    const colors: Record<TyphoonCategory, string> = {
      TROPICAL_DEPRESSION: '#3b82f6',
      TROPICAL_STORM: '#22c55e',
      SEVERE_TROPICAL_STORM: '#eab308',
      TYPHOON: '#f97316',
      SEVERE_TYPHOON: '#ef4444',
      SUPER_TYPHOON: '#8b5cf6',
    }
    return colors[category] || '#6b7280'
  }

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 6,
        splitNumber: 6,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [1 / 6, '#3b82f6'],
              [2 / 6, '#22c55e'],
              [3 / 6, '#eab308'],
              [4 / 6, '#f97316'],
              [5 / 6, '#ef4444'],
              [1, '#8b5cf6'],
            ],
          },
        },
        pointer: {
          itemStyle: {
            color: getCategoryColor(category),
          },
        },
        axisTick: {
          distance: -20,
          length: 8,
          lineStyle: {
            color: '#fff',
            width: 2,
          },
        },
        splitLine: {
          distance: -20,
          length: 20,
          lineStyle: {
            color: '#fff',
            width: 3,
          },
        },
        axisLabel: {
          color: '#94a3b8',
          distance: 30,
          fontSize: 10,
          formatter: function (value: number) {
            const labels = ['', 'TD', 'TS', 'STS', 'TY', 'STY', 'SuperTY']
            return labels[Math.round(value)] || ''
          },
        },
        detail: {
          valueAnimation: true,
          formatter: function (value: number) {
            return getCategoryName(category)
          },
          color: getCategoryColor(category),
          fontSize: 16,
          fontWeight: 'bold',
          offsetCenter: [0, '70%'],
        },
        title: {
          offsetCenter: [0, '90%'],
          fontSize: 12,
          color: '#94a3b8',
        },
        data: [
          {
            value: getCategoryValue(category),
            name: `${windSpeed} knots`,
          },
        ],
      },
    ],
  }

  return (
    <div className={className}>
      <ReactECharts option={option} style={{ height: '250px' }} />
    </div>
  )
}
