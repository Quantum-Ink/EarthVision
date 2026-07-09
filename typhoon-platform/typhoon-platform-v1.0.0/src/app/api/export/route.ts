import { NextRequest, NextResponse } from 'next/server'
import { forecastExportEngine, ExportConfig } from '@/services/export'
import { FusedPoint } from '@/services/data-fusion'
import { MonteCarloResult } from '@/services/probability'
import { AIAnalysisResult } from '@/services/ai-analysis'

// 导出预报图
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      typhoonId,
      typhoonName,
      typhoonNameCn,
      bestTrack,
      monteCarloResult,
      aiAnalysis,
      format = 'SVG',
      width = 1920,
      height = 1080,
      dpi = 300,
      theme = 'dark',
    } = body

    if (!bestTrack || !monteCarloResult || !aiAnalysis) {
      return NextResponse.json(
        { success: false, error: 'Missing required data for export' },
        { status: 400 }
      )
    }

    // 配置导出
    const config: ExportConfig = {
      format: format as 'PNG' | 'SVG' | 'PDF',
      width,
      height,
      dpi,
      theme: theme as 'light' | 'dark',
      layers: {
        historicalTrack: true,
        forecastTrack: true,
        aiTrack: true,
        probabilityCones: true,
        windCircles: true,
        cities: true,
        grid: true,
        legend: true,
        scaleBar: true,
        compass: true,
      },
      metadata: {
        title: `台风${typhoonName || 'Unknown'}预报图`,
        subtitle: typhoonNameCn ? `${typhoonName} (${typhoonNameCn})` : typhoonName || '',
        typhoonId: typhoonId || '',
        typhoonName: typhoonName || 'Unknown',
        typhoonNameCn: typhoonNameCn || '',
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 120 * 3600000),
        source: 'JTWC, CMA, JMA, ECMWF, NOAA',
        analyst: 'AI台风预测系统',
      },
    }

    // 生成 SVG
    const svg = forecastExportEngine.generateSVG({
      config,
      bestTrack: bestTrack as FusedPoint[],
      monteCarloResult: monteCarloResult as MonteCarloResult,
      aiAnalysis: aiAnalysis as AIAnalysisResult,
      timestamp: new Date(),
    })

    // 返回 SVG
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="typhoon_forecast_${typhoonId || 'unknown'}.svg"`,
      },
    })
  } catch (error) {
    console.error('Error in export:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export forecast' },
      { status: 500 }
    )
  }
}
