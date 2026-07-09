import { NextRequest, NextResponse } from 'next/server'
import { collectorRegistry } from '@/services/data-collector/registry'
import { fusionEngine, FusionMethod } from '@/services/data-fusion'

// 融合多源数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { typhoonId, method = 'WEIGHTED_MEAN', sources } = body

    if (!typhoonId) {
      return NextResponse.json(
        { success: false, error: 'Typhoon ID is required' },
        { status: 400 }
      )
    }

    // 采集数据
    const collectedData = await collectorRegistry.collectTyphoon(typhoonId, sources)

    // 转换为融合引擎所需格式
    const dataMap = new Map()
    for (const [source, forecast] of collectedData) {
      if (forecast) {
        dataMap.set(source, forecast)
      }
    }

    if (dataMap.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No data available for fusion' },
        { status: 404 }
      )
    }

    // 执行融合
    let fusedPoints
    const fusionMethod = method as FusionMethod

    switch (fusionMethod) {
      case FusionMethod.KALMAN_FILTER:
        fusedPoints = fusionEngine.fuseKalmanFilter(dataMap)
        break
      case FusionMethod.BAYESIAN_FUSION:
        fusedPoints = fusionEngine.fuseBayesian(dataMap)
        break
      case FusionMethod.ENSEMBLE_FORECAST:
        fusedPoints = fusionEngine.fuseEnsemble(dataMap)
        break
      case FusionMethod.WEIGHTED_MEAN:
      default:
        fusedPoints = fusionEngine.fuseWeightedMean(dataMap)
        break
    }

    return NextResponse.json({
      success: true,
      data: {
        typhoonId,
        method: fusionMethod,
        points: fusedPoints,
        sources: Array.from(dataMap.keys()),
        pointCount: fusedPoints.length,
      },
    })
  } catch (error) {
    console.error('Error in fusion:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fuse data' },
      { status: 500 }
    )
  }
}

// 获取融合方法列表
export async function GET() {
  try {
    const methods = Object.values(FusionMethod).map(method => ({
      id: method,
      name: method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getMethodDescription(method),
    }))

    return NextResponse.json({
      success: true,
      data: methods,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fusion methods' },
      { status: 500 }
    )
  }
}

function getMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    WEIGHTED_MEAN: '基于各机构历史准确率的加权平均融合',
    KALMAN_FILTER: '卡尔曼滤波融合，适用于动态系统',
    PARTICLE_FILTER: '粒子滤波融合，适用于非线性非高斯系统',
    GAUSSIAN_PROCESS: '高斯过程融合，提供不确定性估计',
    BAYESIAN_FUSION: '贝叶斯融合，结合先验知识和观测数据',
    ENSEMBLE_FORECAST: '集成预报融合，综合多个模型结果',
    TRAJECTORY_CLUSTERING: '轨迹聚类融合，基于路径相似性分组',
  }
  return descriptions[method] || '未知方法'
}
