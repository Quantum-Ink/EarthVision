import { NextRequest, NextResponse } from 'next/server'
import { generateMockTyphoonData } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const basin = searchParams.get('basin')
    const year = searchParams.get('year')

    // In production, this would query the database
    // For now, return mock data
    let typhoons = generateMockTyphoonData()

    // Apply filters
    if (status) {
      typhoons = typhoons.filter((t) => t.status === status)
    }
    if (basin) {
      typhoons = typhoons.filter((t) => t.basin === basin)
    }
    if (year) {
      typhoons = typhoons.filter((t) => t.year === parseInt(year))
    }

    return NextResponse.json({
      success: true,
      data: typhoons,
      total: typhoons.length,
    })
  } catch (error) {
    console.error('Error fetching typhoons:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch typhoons' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // In production, this would create a new typhoon in the database
    return NextResponse.json({
      success: true,
      message: 'Typhoon created successfully',
      data: { id: 'new-typhoon-id', ...body },
    })
  } catch (error) {
    console.error('Error creating typhoon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create typhoon' },
      { status: 500 }
    )
  }
}
