import { NextRequest, NextResponse } from 'next/server'
import { generateMockTyphoonData } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const year = searchParams.get('year')
    const source = searchParams.get('source')

    // Get typhoon data
    let typhoons = generateMockTyphoonData()

    // Apply filters
    if (year) {
      typhoons = typhoons.filter((t) => t.year === parseInt(year))
    }
    if (source) {
      typhoons = typhoons.filter((t) => t.dataSource === source)
    }

    // Export as CSV
    if (format === 'csv') {
      const headers = [
        'ID',
        'Name',
        'Name(CN)',
        'International ID',
        'Basin',
        'Year',
        'Category',
        'Status',
        'Latitude',
        'Longitude',
        'Max Wind Speed',
        'Min Pressure',
        'Movement Speed',
        'Movement Direction',
        'Data Source',
        'Start Date',
        'Last Updated',
      ]

      const rows = typhoons.map((t) => [
        t.id,
        t.name,
        t.nameCn || '',
        t.internationalId || '',
        t.basin,
        t.year,
        t.category,
        t.status,
        t.currentLat,
        t.currentLng,
        t.maxWindSpeed,
        t.minPressure,
        t.movementSpeed || '',
        t.movementDir || '',
        t.dataSource,
        t.startDatetime,
        t.lastUpdated,
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="typhoons-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      data: typhoons,
      total: typhoons.length,
      filters: { year, source },
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
