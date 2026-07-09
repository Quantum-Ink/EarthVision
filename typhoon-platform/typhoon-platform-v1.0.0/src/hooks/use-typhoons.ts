'use client'

import { useState, useEffect } from 'react'
import { TyphoonData, AIAnalysis } from '@/types'
import { generateMockTyphoonData } from '@/lib/data'

export function useTyphoons() {
  const [typhoons, setTyphoons] = useState<TyphoonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTyphoons()
  }, [])

  const fetchTyphoons = async () => {
    try {
      setLoading(true)
      // In production, this would fetch from API
      // For now, use mock data
      const mockData = generateMockTyphoonData()
      setTyphoons(mockData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch typhoon data')
      console.error('Error fetching typhoons:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTyphoonById = (id: string): TyphoonData | undefined => {
    return typhoons.find((t) => t.id === id)
  }

  return {
    typhoons,
    loading,
    error,
    fetchTyphoons,
    getTyphoonById,
  }
}

export function useTyphoonAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeTyphoon = async (typhoonId: string, analysisType: string) => {
    try {
      setLoading(true)
      setError(null)

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

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data)
      return data
    } catch (err) {
      setError('Failed to analyze typhoon')
      console.error('Error analyzing typhoon:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    analysis,
    loading,
    error,
    analyzeTyphoon,
  }
}
