import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock admin data
    const adminData = {
      dataSources: [
        {
          id: 'jtwc',
          name: 'JTWC - Joint Typhoon Warning Center',
          url: 'https://www.metoc.navy.mil/jtwc',
          lastSync: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          errorMessage: null,
        },
        {
          id: 'noaa',
          name: 'NOAA - National Oceanic and Atmospheric Administration',
          url: 'https://www.nhc.noaa.gov',
          lastSync: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          errorMessage: null,
        },
        {
          id: 'cma',
          name: 'CMA - China Meteorological Administration',
          url: 'http://typhoon.nmc.cn',
          lastSync: new Date().toISOString(),
          syncStatus: 'SYNCING',
          errorMessage: null,
        },
        {
          id: 'jma',
          name: 'JMA - Japan Meteorological Agency',
          url: 'https://www.jma.go.jp',
          lastSync: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          errorMessage: null,
        },
        {
          id: 'ecmwf',
          name: 'ECMWF - European Centre for Medium-Range Weather Forecasts',
          url: 'https://www.ecmwf.int',
          lastSync: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          errorMessage: null,
        },
      ],
      aiUsage: {
        totalCalls: 1250,
        todayCalls: 45,
        totalTokens: 2500000,
        todayTokens: 125000,
        averageResponseTime: 2.5,
        successRate: 99.2,
      },
      users: [
        {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
          lastLogin: new Date().toISOString(),
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          email: 'analyst@example.com',
          name: 'Analyst',
          role: 'ANALYST',
          lastLogin: new Date().toISOString(),
          createdAt: '2024-01-15T00:00:00Z',
        },
        {
          id: '3',
          email: 'viewer@example.com',
          name: 'Viewer',
          role: 'VIEWER',
          lastLogin: new Date().toISOString(),
          createdAt: '2024-02-01T00:00:00Z',
        },
      ],
      systemStatus: {
        apiStatus: 'healthy',
        databaseStatus: 'healthy',
        aiServiceStatus: 'healthy',
        uptime: '99.9%',
        lastBackup: new Date().toISOString(),
      },
    }

    return NextResponse.json({
      success: true,
      data: adminData,
    })
  } catch (error) {
    console.error('Error fetching admin data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, target } = body

    // Handle different admin actions
    switch (action) {
      case 'sync':
        return NextResponse.json({
          success: true,
          message: `Syncing ${target}...`,
        })
      case 'reset':
        return NextResponse.json({
          success: true,
          message: `Reset ${target} successfully`,
        })
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing admin action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
