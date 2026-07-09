import { NextRequest, NextResponse } from 'next/server'
import { generateMockTyphoonData } from '@/lib/data'

// 历史台风数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const basin = searchParams.get('basin')
    const category = searchParams.get('category')
    const country = searchParams.get('country')
    const name = searchParams.get('name')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 获取历史数据
    let typhoons = generateMockTyphoonData()

    // 应用筛选
    if (year) {
      typhoons = typhoons.filter(t => t.year === parseInt(year))
    }
    if (basin) {
      typhoons = typhoons.filter(t => t.basin === basin)
    }
    if (category) {
      typhoons = typhoons.filter(t => t.category === category)
    }
    if (name) {
      typhoons = typhoons.filter(t =>
        t.name.toLowerCase().includes(name.toLowerCase()) ||
        (t.nameCn && t.nameCn.includes(name))
      )
    }

    // 分页
    const total = typhoons.length
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedTyphoons = typhoons.slice(start, end)

    // 统计信息
    const statistics = calculateStatistics(typhoons)

    return NextResponse.json({
      success: true,
      data: paginatedTyphoons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics,
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

// 计算统计信息
function calculateStatistics(typhoons: any[]) {
  const total = typhoons.length

  // 按年份统计
  const byYear: Record<number, number> = {}
  typhoons.forEach(t => {
    byYear[t.year] = (byYear[t.year] || 0) + 1
  })

  // 按海域统计
  const byBasin: Record<string, number> = {}
  typhoons.forEach(t => {
    byBasin[t.basin] = (byBasin[t.basin] || 0) + 1
  })

  // 按类别统计
  const byCategory: Record<string, number> = {}
  typhoons.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1
  })

  // 强度统计
  const maxWindSpeed = Math.max(...typhoons.map(t => t.maxWindSpeed))
  const minPressure = Math.min(...typhoons.map(t => t.minPressure))
  const avgWindSpeed = typhoons.reduce((sum, t) => sum + t.maxWindSpeed, 0) / total

  return {
    total,
    byYear,
    byBasin,
    byCategory,
    maxWindSpeed,
    minPressure,
    avgWindSpeed: Math.round(avgWindSpeed),
  }
}
