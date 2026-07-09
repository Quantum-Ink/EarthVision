'use client'

import React from 'react'
import ReactECharts from 'echarts-for-react'
import { CityImpact } from '@/types'

interface RiskMatrixProps {
  impacts: CityImpact[]
  className?: string
}

export function RiskMatrix({ impacts, className = '' }: RiskMatrixProps) {
  const getImpactColor = (level: string) => {
    const colors: Record<string, string> = {
      low: '#22c55e',
      moderate: '#eab308',
      high: '#f97316',
      extreme: '#ef4444',
    }
    return colors[level] || '#6b7280'
  }

  const data = impacts.map((impact) => ({
    name: impact.city,
    value: [impact.estimatedWindSpeed, impact.estimatedRainfall, impact.populationAtRisk / 10000],
    itemStyle: {
      color: getImpactColor(impact.impactLevel),
    },
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function (params: any) {
        const d = params.data
        return `
          <div style="padding: 10px;">
            <h4 style="margin: 0 0 8px 0;">${d.name}</h4>
            <p style="margin: 4px 0;">预计风速: ${d.value[0]} knots</p>
            <p style="margin: 4px 0;">预计降雨: ${d.value[1]} mm</p>
            <p style="margin: 4px 0;">影响人口: ${d.value[2].toFixed(1)} 万</p>
          </div>
        `
      },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(100, 116, 139, 0.5)',
      textStyle: {
        color: '#fff',
      },
    },
    xAxis: {
      name: '预计风速 (knots)',
      nameTextStyle: {
        color: '#94a3b8',
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(100, 116, 139, 0.3)',
        },
      },
      axisLabel: {
        color: '#94a3b8',
      },
    },
    yAxis: {
      name: '预计降雨 (mm)',
      nameTextStyle: {
        color: '#94a3b8',
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(100, 116, 139, 0.3)',
        },
      },
      axisLabel: {
        color: '#94a3b8',
      },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: function (data: number[]) {
          return Math.sqrt(data[2]) * 10
        },
        data: data,
        label: {
          show: true,
          formatter: '{b}',
          position: 'top',
          color: '#94a3b8',
        },
      },
    ],
  }

  return (
    <div className={className}>
      <ReactECharts option={option} style={{ height: '300px' }} />
    </div>
  )
}
