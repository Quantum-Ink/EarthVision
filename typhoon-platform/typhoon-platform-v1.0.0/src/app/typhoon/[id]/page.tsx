'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TyphoonData, AIAnalysis } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'
import { TyphoonDetail } from '@/components/typhoon/typhoon-detail'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function TyphoonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [typhoon, setTyphoon] = useState<TyphoonData | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = params.id as string
    // Load mock data
    const mockData = generateMockTyphoonData()
    const found = mockData.find((t) => t.id === id)
    setTyphoon(found || null)
    setLoading(false)
  }, [params.id])

  const handleAnalyze = async () => {
    if (!typhoon) return

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typhoonId: typhoon.id,
          analysisType: 'FULL_REPORT',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.data)
      }
    } catch (error) {
      console.error('Error analyzing typhoon:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!typhoon) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">台风未找到</h1>
        <p className="text-muted-foreground mb-6">无法找到指定的台风数据</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          返回
        </button>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center space-x-1"
        >
          <span>←</span>
          <span>返回</span>
        </button>
      </div>

      <TyphoonDetail typhoon={typhoon} analysis={analysis || undefined} />

      {!analysis && (
        <div className="mt-6 text-center">
          <button
            onClick={handleAnalyze}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2 mx-auto"
          >
            <span>🤖</span>
            <span>AI智能分析</span>
          </button>
        </div>
      )}
    </div>
  )
}
