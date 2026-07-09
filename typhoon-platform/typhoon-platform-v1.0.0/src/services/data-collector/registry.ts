import { BaseCollector, TyphoonForecastData } from './base-collector'
import { JTWCCollector } from './jtwc-collector'
import { CMACollector } from './cma-collector'
import { JMACollector } from './jma-collector'
import { ECMWFCollector } from './ecmwf-collector'
import { NOAACollector } from './noaa-collector'

// 数据采集器注册中心
export class CollectorRegistry {
  private collectors: Map<string, BaseCollector> = new Map()
  private static instance: CollectorRegistry

  private constructor() {
    this.registerDefaults()
  }

  static getInstance(): CollectorRegistry {
    if (!CollectorRegistry.instance) {
      CollectorRegistry.instance = new CollectorRegistry()
    }
    return CollectorRegistry.instance
  }

  private registerDefaults() {
    this.register(new JTWCCollector())
    this.register(new CMACollector())
    this.register(new JMACollector())
    this.register(new ECMWFCollector())
    this.register(new NOAACollector())
  }

  register(collector: BaseCollector) {
    this.collectors.set(collector.source, collector)
    console.log(`Registered collector: ${collector.source} (${collector.name})`)
  }

  get(source: string): BaseCollector | undefined {
    return this.collectors.get(source)
  }

  getAll(): BaseCollector[] {
    return Array.from(this.collectors.values())
  }

  getSources(): string[] {
    return Array.from(this.collectors.keys())
  }

  async collectAll(): Promise<Map<string, TyphoonForecastData[]>> {
    const results = new Map<string, TyphoonForecastData[]>()

    const promises = Array.from(this.collectors.entries()).map(async ([source, collector]) => {
      try {
        const data = await collector.collectActiveTyphoons()
        results.set(source, data)
        console.log(`Collected ${data.length} typhoons from ${source}`)
      } catch (error) {
        console.error(`Error collecting from ${source}:`, error)
        results.set(source, [])
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  async collectTyphoon(typhoonId: string, sources?: string[]): Promise<Map<string, TyphoonForecastData | null>> {
    const results = new Map<string, TyphoonForecastData | null>()
    const targetSources = sources || this.getSources()

    const promises = targetSources.map(async (source) => {
      const collector = this.collectors.get(source)
      if (collector) {
        try {
          const data = await collector.collectForecast(typhoonId)
          results.set(source, data)
        } catch (error) {
          console.error(`Error collecting ${typhoonId} from ${source}:`, error)
          results.set(source, null)
        }
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    const promises = Array.from(this.collectors.entries()).map(async ([source, collector]) => {
      try {
        const healthy = await collector.healthCheck()
        results.set(source, healthy)
      } catch {
        results.set(source, false)
      }
    })

    await Promise.allSettled(promises)
    return results
  }
}

// 导出单例
export const collectorRegistry = CollectorRegistry.getInstance()
