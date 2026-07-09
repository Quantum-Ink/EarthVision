'use client'

import React, { useState } from 'react'
import { TyphoonData, AIAnalysis } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'
import { AnalysisForm } from '@/components/ai/analysis-form'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Brain, Zap, Clock } from 'lucide-react'

export default function AnalysisPage() {
  const [typhoons] = useState<TyphoonData[]>(() => generateMockTyphoonData())
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async (typhoonId: string, analysisType: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typhoonId,
          analysisType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.data)
      }
    } catch (error) {
      console.error('Error analyzing typhoon:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-500" />
          <span>AI智能分析</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          使用先进的人工智能技术分析台风路径、评估风险、生成防灾建议
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">路径预测</h3>
                <p className="text-sm text-muted-foreground">基于深度学习的台风路径预测</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">风险评估</h3>
                <p className="text-sm text-muted-foreground">多维度台风风险等级评估</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">实时分析</h3>
                <p className="text-sm text-muted-foreground">实时生成分析报告和建议</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Form */}
      <AnalysisForm
        typhoons={typhoons}
        onAnalyze={handleAnalyze}
        analysis={analysis}
        loading={loading}
      />
    </div>
  )
}
