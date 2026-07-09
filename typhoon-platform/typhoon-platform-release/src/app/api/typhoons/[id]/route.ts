import { NextRequest, NextResponse } from 'next/server'
import { generateMockTyphoonData } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // In production, this would query the database
    const typhoons = generateMockTyphoonData()
    const typhoon = typhoons.find((t) => t.id === id)

    if (!typhoon) {
      return NextResponse.json(
        { success: false, error: 'Typhoon not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: typhoon,
    })
  } catch (error) {
    console.error('Error fetching typhoon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch typhoon' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // In production, this would update the typhoon in the database
    return NextResponse.json({
      success: true,
      message: 'Typhoon updated successfully',
      data: { id, ...body },
    })
  } catch (error) {
    console.error('Error updating typhoon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update typhoon' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // In production, this would delete the typhoon from the database
    return NextResponse.json({
      success: true,
      message: 'Typhoon deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting typhoon:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete typhoon' },
      { status: 500 }
    )
  }
}
