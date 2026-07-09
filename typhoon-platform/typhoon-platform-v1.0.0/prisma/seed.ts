import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create data sources
  const dataSources = await Promise.all([
    prisma.dataSource.create({
      data: {
        name: 'JTWC - Joint Typhoon Warning Center',
        url: 'https://www.metoc.navy.mil/jtwc',
        syncStatus: 'SUCCESS',
        lastSync: new Date(),
      },
    }),
    prisma.dataSource.create({
      data: {
        name: 'NOAA - National Oceanic and Atmospheric Administration',
        url: 'https://www.nhc.noaa.gov',
        syncStatus: 'SUCCESS',
        lastSync: new Date(),
      },
    }),
    prisma.dataSource.create({
      data: {
        name: 'CMA - China Meteorological Administration',
        url: 'http://typhoon.nmc.cn',
        syncStatus: 'SUCCESS',
        lastSync: new Date(),
      },
    }),
    prisma.dataSource.create({
      data: {
        name: 'JMA - Japan Meteorological Agency',
        url: 'https://www.jma.go.jp',
        syncStatus: 'SUCCESS',
        lastSync: new Date(),
      },
    }),
    prisma.dataSource.create({
      data: {
        name: 'ECMWF - European Centre for Medium-Range Weather Forecasts',
        url: 'https://www.ecmwf.int',
        syncStatus: 'SUCCESS',
        lastSync: new Date(),
      },
    }),
  ])

  console.log('Created data sources:', dataSources.length)

  // Create sample typhoons
  const typhoons = await Promise.all([
    prisma.typhoon.create({
      data: {
        name: 'GAEMI',
        nameCn: '格美',
        internationalId: '202404W',
        basin: 'Western Pacific',
        year: 2024,
        category: 'SUPER_TYPHOON',
        status: 'ACTIVE',
        currentLat: 18.5,
        currentLng: 128.3,
        maxWindSpeed: 140,
        minPressure: 935,
        movementSpeed: 12,
        movementDir: 'NW',
        radius15knots: 300,
        radius30knots: 150,
        radius50knots: 80,
        startDatetime: new Date(Date.now() - 7 * 24 * 3600000),
        dataSource: 'JTWC',
        description: '超强台风格美，正在向西北方向移动',
      },
    }),
    prisma.typhoon.create({
      data: {
        name: 'PRAPIROON',
        nameCn: '派比安',
        internationalId: '202405W',
        basin: 'Western Pacific',
        year: 2024,
        category: 'TROPICAL_STORM',
        status: 'ACTIVE',
        currentLat: 12.5,
        currentLng: 125.3,
        maxWindSpeed: 45,
        minPressure: 998,
        movementSpeed: 15,
        movementDir: 'NW',
        radius15knots: 150,
        radius30knots: 80,
        radius50knots: 30,
        startDatetime: new Date(Date.now() - 3 * 24 * 3600000),
        dataSource: 'JTWC',
        description: '热带风暴派比安',
      },
    }),
    prisma.typhoon.create({
      data: {
        name: 'MARIA',
        nameCn: '玛丽亚',
        internationalId: '202406W',
        basin: 'Western Pacific',
        year: 2024,
        category: 'SEVERE_TYPHOON',
        status: 'ACTIVE',
        currentLat: 22.1,
        currentLng: 135.8,
        maxWindSpeed: 110,
        minPressure: 945,
        movementSpeed: 12,
        movementDir: 'N',
        radius15knots: 250,
        radius30knots: 120,
        radius50knots: 60,
        startDatetime: new Date(Date.now() - 5 * 24 * 3600000),
        dataSource: 'JTWC',
        description: '强台风玛丽亚，向北移动',
      },
    }),
  ])

  console.log('Created typhoons:', typhoons.length)

  // Create typhoon positions
  for (const typhoon of typhoons) {
    const positions = []
    for (let i = 24; i >= 0; i--) {
      const time = new Date(Date.now() - i * 3600000)
      positions.push({
        typhoonId: typhoon.id,
        latitude: typhoon.currentLat + Math.random() * 2 - 1 - i * 0.1,
        longitude: typhoon.currentLng + Math.random() * 2 - 1 - i * 0.2,
        windSpeed: typhoon.maxWindSpeed + Math.random() * 20 - 10,
        pressure: typhoon.minPressure + Math.random() * 10 - 5,
        category: typhoon.category,
        timestamp: time,
        movementSpeed: typhoon.movementSpeed || 10,
        movementDir: typhoon.movementDir || 'NW',
        radius15knots: typhoon.radius15knots || 200,
        radius30knots: typhoon.radius30knots || 100,
        radius50knots: typhoon.radius50knots || 50,
      })
    }

    await prisma.typhoonPosition.createMany({
      data: positions,
    })
  }

  console.log('Created typhoon positions')

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        lastLogin: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'analyst@example.com',
        name: 'Analyst',
        role: 'ANALYST',
        lastLogin: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'viewer@example.com',
        name: 'Viewer',
        role: 'VIEWER',
        lastLogin: new Date(),
      },
    }),
  ])

  console.log('Created users:', users.length)

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
