import { NextRequest, NextResponse } from 'next/server'
import { probabilityEngine } from '@/services/probability'
import { FusedPoint } from '@/services/data-fusion'

// 概率模拟
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bestTrack,
      method = 'MONTE_CARLO',
      numSimulations = 1000,
      probabilities = [0.5, 0.7, 0.9],
      maxForecastHour = 120,
    } = body

    if (!bestTrack || !Array.isArray(bestTrack) || bestTrack.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Best track data is required' },
        { status: 400 }
      )
    }

    // 转换为 FusedPoint 格式
    const fusedPoints: FusedPoint[] = bestTrack.map((point: any) => ({
      latitude: point.latitude || point.lat,
      longitude: point.longitude || point.lng,
      windSpeed: point.windSpeed || point.wind,
      windGust: point.windGust || (point.windSpeed || point.wind) * 1.3,
      pressure: point.pressure,
      category: point.category || 'TROPICAL_STORM',
      movementSpeed: point.movementSpeed,
      movementDir: point.movementDir,
      forecastHour: point.forecastHour || 0,
      timestamp: point.timestamp || new Date().toISOString(),
      confidence: point.confidence || 0.8,
      variance: 0,
      weights: {},
      sources: [],
    }))

    let result

    if (method === 'BOOTSTRAP') {
      result = await probabilityEngine.bootstrapSampling(fusedPoints, numSimulations)
    } else {
      // 默认使用 Monte Carlo
      result = await probabilityEngine.monteCarloSimulation(fusedPoints, {
        numSimulations,
        probabilities,
        maxForecastHour,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        method,
        statistics: result.statistics,
        simulationCount: result.paths.length,
        confidenceCones: result.statistics.confidenceCones,
        landfallProbability: result.statistics.landfallProbability,
        cityImpactProbability: result.statistics.cityImpactProbability,
      },
    })
  } catch (error) {
    console.error('Error in probability simulation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run probability simulation' },
      { status: 500 }
    )
  }
}
