import { NextRequest, NextResponse } from 'next/server'
import { generateMockTyphoonData } from '@/lib/data'
import { generateFullReport } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { typhoonId, analysisType } = body

    if (!typhoonId) {
      return NextResponse.json(
        { success: false, error: 'Typhoon ID is required' },
        { status: 400 }
      )
    }

    // Get typhoon data
    const typhoons = generateMockTyphoonData()
    const typhoon = typhoons.find((t) => t.id === typhoonId)

    if (!typhoon) {
      return NextResponse.json(
        { success: false, error: 'Typhoon not found' },
        { status: 404 }
      )
    }

    // In production, this would call the MIMO API
    // For now, return mock analysis
    const mockAnalysis = {
      id: `analysis-${Date.now()}`,
      typhoonId: typhoon.id,
      analysisType: analysisType || 'FULL_REPORT',
      summary: `台风${typhoon.name}（${typhoon.nameCn || ''}）当前位于${typhoon.currentLat.toFixed(1)}°N, ${typhoon.currentLng.toFixed(1)}°E，最大风速${typhoon.maxWindSpeed} knots，最低气压${typhoon.minPressure} hPa。

预计台风将继续向西北方向移动，未来72小时内可能影响华东沿海地区。建议相关地区做好防台风准备工作。

风险等级：${typhoon.maxWindSpeed >= 130 ? '极端' : typhoon.maxWindSpeed >= 90 ? '高' : typhoon.maxWindSpeed >= 50 ? '中等' : '低'}
登陆概率：约65%
可能影响城市：温州、台州、宁波、福州等沿海城市`,
      pathPrediction: {
        points: [
          { lat: typhoon.currentLat, lng: typhoon.currentLng, time: new Date().toISOString(), confidence: 0.95 },
          { lat: typhoon.currentLat + 1.5, lng: typhoon.currentLng - 2, time: new Date(Date.now() + 24 * 3600000).toISOString(), confidence: 0.85 },
          { lat: typhoon.currentLat + 3, lng: typhoon.currentLng - 4, time: new Date(Date.now() + 48 * 3600000).toISOString(), confidence: 0.75 },
          { lat: typhoon.currentLat + 4.5, lng: typhoon.currentLng - 6, time: new Date(Date.now() + 72 * 3600000).toISOString(), confidence: 0.65 },
        ],
        trend: 'northwest',
        speed: typhoon.movementSpeed || 15,
      },
      landingProbability: {
        probability: 65,
        possibleLocations: [
          { location: '浙江温州', lat: 28.0, lng: 120.7, probability: 35 },
          { location: '浙江台州', lat: 28.7, lng: 121.4, probability: 25 },
          { location: '福建福州', lat: 26.1, lng: 119.3, probability: 20 },
        ],
        timeframe: '72小时内',
      },
      cityImpact: [
        {
          city: '温州',
          province: '浙江',
          country: '中国',
          lat: 28.0,
          lng: 120.7,
          impactLevel: 'high',
          estimatedWindSpeed: 85,
          estimatedRainfall: 150,
          populationAtRisk: 9000000,
          infrastructureRisk: '中等',
        },
        {
          city: '台州',
          province: '浙江',
          country: '中国',
          lat: 28.7,
          lng: 121.4,
          impactLevel: 'moderate',
          estimatedWindSpeed: 65,
          estimatedRainfall: 120,
          populationAtRisk: 6000000,
          infrastructureRisk: '低',
        },
        {
          city: '福州',
          province: '福建',
          country: '中国',
          lat: 26.1,
          lng: 119.3,
          impactLevel: 'moderate',
          estimatedWindSpeed: 55,
          estimatedRainfall: 100,
          populationAtRisk: 7000000,
          infrastructureRisk: '低',
        },
      ],
      riskLevel: typhoon.maxWindSpeed >= 130 ? 'EXTREME' : typhoon.maxWindSpeed >= 90 ? 'HIGH' : typhoon.maxWindSpeed >= 50 ? 'MODERATE' : 'LOW',
      suggestions: [
        {
          category: '政府应急',
          priority: 'critical',
          title: '启动防台风应急预案',
          description: '根据台风强度和路径，建议立即启动相应级别的防台风应急预案',
          actions: [
            '组织沿海地区人员转移',
            '准备救灾物资和救援队伍',
            '加强海堤和水库巡查',
            '停止海上作业和滨海旅游',
          ],
        },
        {
          category: '公众防护',
          priority: 'high',
          title: '公众防护措施',
          description: '台风期间公众应做好个人防护',
          actions: [
            '减少不必要的外出',
            '储备食物、饮水和应急物资',
            '关注官方发布的台风信息',
            '远离海边和低洼地区',
          ],
        },
        {
          category: '农业生产',
          priority: 'medium',
          title: '农业防灾措施',
          description: '农业生产应提前做好防台风准备',
          actions: [
            '抢收成熟农作物',
            '加固农业设施',
            '疏通排水沟渠',
            '做好病虫害防治准备',
          ],
        },
        {
          category: '交通运输',
          priority: 'high',
          title: '交通安全措施',
          description: '台风期间交通运输安全措施',
          actions: [
            '航班和轮渡可能延误或取消',
            '高速公路可能临时封闭',
            '避免在强风期间驾车出行',
            '关注交通部门发布的出行提示',
          ],
        },
      ],
      modelVersion: 'mimo-v2.5-pro',
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: mockAnalysis,
    })
  } catch (error) {
    console.error('Error analyzing typhoon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze typhoon' },
      { status: 500 }
    )
  }
}
