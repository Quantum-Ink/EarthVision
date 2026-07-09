import { NextRequest, NextResponse } from 'next/server'
import { collectorRegistry } from '@/services/data-collector/registry'
import { fusionEngine } from '@/services/data-fusion'
import { probabilityEngine } from '@/services/probability'
import { aiAnalysisEngine } from '@/services/ai-analysis'

// 综合预测
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { typhoonId, typhoonName, numSimulations = 500 } = body

    if (!typhoonId) {
      return NextResponse.json(
        { success: false, error: 'Typhoon ID is required' },
        { status: 400 }
      )
    }

    console.log(`Starting prediction for typhoon ${typhoonId}...`)

    // 1. 采集多源数据
    const collectedData = await collectorRegistry.collectTyphoon(typhoonId)
    const dataMap = new Map()
    for (const [source, forecast] of collectedData) {
      if (forecast) {
        dataMap.set(source, forecast)
      }
    }

    if (dataMap.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No data available' },
        { status: 404 }
      )
    }

    // 2. 数据融合
    const fusedPoints = fusionEngine.fuseWeightedMean(dataMap)

    // 3. Monte Carlo 模拟
    const monteCarloResult = await probabilityEngine.monteCarloSimulation(fusedPoints, {
      numSimulations,
      probabilities: [0.5, 0.7, 0.9],
      maxForecastHour: 120,
    })

    // 4. AI 分析
    const aiAnalysis = await aiAnalysisEngine.analyze(
      typhoonName || 'Unknown',
      fusedPoints,
      monteCarloResult
    )

    // 5. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        typhoonId,
        typhoonName,
        fusedPath: fusedPoints,
        probabilityCones: monteCarloResult.statistics.confidenceCones,
        landfallProbability: monteCarloResult.statistics.landfallProbability,
        cityImpact: monteCarloResult.statistics.cityImpactProbability,
        aiAnalysis: {
          summary: aiAnalysis.summary,
          pathAnalysis: aiAnalysis.pathAnalysis,
          intensityAnalysis: aiAnalysis.intensityAnalysis,
          landfallAnalysis: aiAnalysis.landfallAnalysis,
          riskAnalysis: aiAnalysis.riskAnalysis,
          cityImpactAnalysis: aiAnalysis.cityImpactAnalysis,
          suggestions: aiAnalysis.suggestions,
          confidenceScore: aiAnalysis.confidenceScore,
        },
        metadata: {
          sources: Array.from(dataMap.keys()),
          fusionMethod: 'WEIGHTED_MEAN',
          simulationCount: numSimulations,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Error in prediction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run prediction' },
      { status: 500 }
    )
  }
}
