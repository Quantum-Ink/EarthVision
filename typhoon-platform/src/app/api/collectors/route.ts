import { NextRequest, NextResponse } from 'next/server'
import { collectorRegistry } from '@/services/data-collector/registry'

// 获取所有数据源状态
export async function GET() {
  try {
    const sources = collectorRegistry.getSources()
    const healthStatus = await collectorRegistry.healthCheck()

    const dataSources = sources.map(source => ({
      source,
      healthy: healthStatus.get(source) || false,
    }))

    return NextResponse.json({
      success: true,
      data: dataSources,
      total: dataSources.length,
    })
  } catch (error) {
    console.error('Error fetching collectors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collectors' },
      { status: 500 }
    )
  }
}

// 触发数据采集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, source, typhoonId } = body

    if (action === 'collect-all') {
      // 采集所有数据源
      const results = await collectorRegistry.collectAll()
      const data: Record<string, any[]> = {}

      for (const [src, forecasts] of results) {
        data[src] = forecasts
      }

      return NextResponse.json({
        success: true,
        data,
        message: 'Data collection completed',
      })
    }

    if (action === 'collect-typhoon' && typhoonId) {
      // 采集特定台风数据
      const results = await collectorRegistry.collectTyphoon(typhoonId, source ? [source] : undefined)
      const data: Record<string, any> = {}

      for (const [src, forecast] of results) {
        if (forecast) {
          data[src] = forecast
        }
      }

      return NextResponse.json({
        success: true,
        data,
        message: `Data collected for typhoon ${typhoonId}`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in collector action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform collection' },
      { status: 500 }
    )
  }
}
