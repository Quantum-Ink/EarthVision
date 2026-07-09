'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { TyphoonPosition } from '@/types'
import { format } from 'date-fns'

interface WindSpeedChartProps {
  positions: TyphoonPosition[]
  className?: string
}

export function WindSpeedChart({ positions, className = '' }: WindSpeedChartProps) {
  const data = positions.map((pos) => ({
    time: format(new Date(pos.timestamp), 'MM/dd HH:mm'),
    windSpeed: pos.windSpeed,
    pressure: pos.pressure,
    category: pos.category,
  }))

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      TROPICAL_DEPRESSION: '#3b82f6',
      TROPICAL_STORM: '#22c55e',
      SEVERE_TROPICAL_STORM: '#eab308',
      TYPHOON: '#f97316',
      SEVERE_TYPHOON: '#ef4444',
      SUPER_TYPHOON: '#8b5cf6',
    }
    return colors[category] || '#6b7280'
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="windSpeedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            yAxisId="wind"
            stroke="#3b82f6"
            tick={{ fill: '#3b82f6', fontSize: 12 }}
            label={{ value: '风速 (knots)', angle: -90, position: 'insideLeft', fill: '#3b82f6' }}
          />
          <YAxis
            yAxisId="pressure"
            orientation="right"
            stroke="#ef4444"
            tick={{ fill: '#ef4444', fontSize: 12 }}
            label={{ value: '气压 (hPa)', angle: 90, position: 'insideRight', fill: '#ef4444' }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(100, 116, 139, 0.5)',
              borderRadius: '8px',
              color: 'white',
            }}
          />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          <Area
            yAxisId="wind"
            type="monotone"
            dataKey="windSpeed"
            name="风速"
            stroke="#3b82f6"
            fill="url(#windSpeedGradient)"
            strokeWidth={2}
          />
          <Area
            yAxisId="pressure"
            type="monotone"
            dataKey="pressure"
            name="气压"
            stroke="#ef4444"
            fill="url(#pressureGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
