import { TyphoonData, AIAnalysis, PathPrediction, LandingProbability, CityImpact, Suggestion, RiskLevel } from '@/types'

const MIMO_API_KEY = process.env.MIMO_API_KEY
const MIMO_API_URL = process.env.MIMO_API_URL || 'https://api.mimo.com/v1'

interface MIMOResponse {
  id: string
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
}

export async function callMIMOAPI(prompt: string, systemPrompt?: string): Promise<MIMOResponse> {
  const response = await fetch(`${MIMO_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mimo-v2.5-pro',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    throw new Error(`MIMO API error: ${response.statusText}`)
  }

  return response.json()
}

export async function analyzeTyphoonPath(typhoon: TyphoonData): Promise<PathPrediction> {
  const systemPrompt = `你是一个专业的台风路径预测专家。基于提供的台风数据，预测台风未来路径。
请以JSON格式返回预测结果，包含以下字段：
{
  "points": [{"lat": number, "lng": number, "time": string, "confidence": number}],
  "trend": "north" | "south" | "east" | "west" | "stationary",
  "speed": number
}`

  const prompt = `分析以下台风数据并预测未来72小时路径：
台风名称: ${typhoon.name}
当前位置: ${typhoon.currentLat}°N, ${typhoon.currentLng}°E
最大风速: ${typhoon.maxWindSpeed} knots
最低气压: ${typhoon.minPressure} hPa
移动方向: ${typhoon.movementDir || '未知'}
移动速度: ${typhoon.movementSpeed || '未知'} knots
历史位置点数: ${typhoon.positions?.length || 0}

历史路径数据:
${typhoon.positions?.slice(-10).map(p =>
  `时间: ${p.timestamp}, 位置: ${p.latitude}°N, ${p.longitude}°E, 风速: ${p.windSpeed}kt`
).join('\n') || '无历史数据'}`

  const response = await callMIMOAPI(prompt, systemPrompt)
  const content = response.choices[0]?.message?.content

  try {
    const jsonMatch = content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse path prediction:', e)
  }

  return {
    points: [],
    trend: 'north',
    speed: typhoon.movementSpeed || 10
  }
}

export async function calculateLandingProbability(typhoon: TyphoonData): Promise<LandingProbability> {
  const systemPrompt = `你是一个台风登陆概率分析专家。基于台风数据计算登陆概率和可能登陆点。
请以JSON格式返回结果：
{
  "probability": number (0-100),
  "possibleLocations": [{"location": string, "lat": number, "lng": number, "probability": number}],
  "timeframe": string
}`

  const prompt = `分析以下台风的登陆概率：
台风名称: ${typhoon.name}
当前位置: ${typhoon.currentLat}°N, ${typhoon.currentLng}°E
移动方向: ${typhoon.movementDir || '未知'}
移动速度: ${typhoon.movementSpeed || '未知'} knots
最大风速: ${typhoon.maxWindSpeed} knots
盆地: ${typhoon.basin}

历史路径:
${typhoon.positions?.slice(-5).map(p =>
  `${p.latitude}°N, ${p.longitude}°E`
).join(' -> ') || '无历史数据'}`

  const response = await callMIMOAPI(prompt, systemPrompt)
  const content = response.choices[0]?.message?.content

  try {
    const jsonMatch = content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse landing probability:', e)
  }

  return {
    probability: 30,
    possibleLocations: [],
    timeframe: '72小时内'
  }
}

export async function analyzeCityImpact(typhoon: TyphoonData): Promise<CityImpact[]> {
  const systemPrompt = `你是一个台风影响评估专家。分析台风可能影响的城市和地区。
请以JSON格式返回结果数组：
[{
  "city": string,
  "province": string,
  "country": string,
  "lat": number,
  "lng": number,
  "impactLevel": "low" | "moderate" | "high" | "extreme",
  "estimatedWindSpeed": number,
  "estimatedRainfall": number,
  "populationAtRisk": number,
  "infrastructureRisk": string
}]`

  const prompt = `分析以下台风可能影响的城市：
台风名称: ${typhoon.name}
当前位置: ${typhoon.currentLat}°N, ${typhoon.currentLng}°E
最大风速: ${typhoon.maxWindSpeed} knots
15节风圈半径: ${typhoon.radius15knots || '未知'} km
30节风圈半径: ${typhoon.radius30knots || '未知'} km
50节风圈半径: ${typhoon.radius50knots || '未知'} km
移动方向: ${typhoon.movementDir || '未知'}

请列出可能受影响的主要城市（最多10个），评估影响程度。`

  const response = await callMIMOAPI(prompt, systemPrompt)
  const content = response.choices[0]?.message?.content

  try {
    const jsonMatch = content?.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse city impact:', e)
  }

  return []
}

export async function assessRiskLevel(typhoon: TyphoonData): Promise<RiskLevel> {
  const systemPrompt = `你是一个台风风险评估专家。评估台风的风险等级。
只返回一个JSON对象：{"riskLevel": "LOW" | "MODERATE" | "HIGH" | "EXTREME"}`

  const prompt = `评估以下台风的风险等级：
台风名称: ${typhoon.name}
最大风速: ${typhoon.maxWindSpeed} knots
最低气压: ${typhoon.minPressure} hPa
类别: ${typhoon.category}
移动速度: ${typhoon.movementSpeed || '未知'} knots`

  const response = await callMIMOAPI(prompt, systemPrompt)
  const content = response.choices[0]?.message?.content

  try {
    const jsonMatch = content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return result.riskLevel || 'MODERATE'
    }
  } catch (e) {
    console.error('Failed to parse risk level:', e)
  }

  if (typhoon.maxWindSpeed >= 130) return 'EXTREME'
  if (typhoon.maxWindSpeed >= 90) return 'HIGH'
  if (typhoon.maxWindSpeed >= 50) return 'MODERATE'
  return 'LOW'
}

export async function generateSuggestions(typhoon: TyphoonData, riskLevel: RiskLevel): Promise<Suggestion[]> {
  const systemPrompt = `你是一个防灾减灾专家。基于台风情况提供防灾建议。
请以JSON格式返回建议数组：
[{
  "category": string,
  "priority": "low" | "medium" | "high" | "critical",
  "title": string,
  "description": string,
  "actions": [string]
}]`

  const prompt = `为以下台风情况提供防灾建议：
台风名称: ${typhoon.name}
风险等级: ${riskLevel}
最大风速: ${typhoon.maxWindSpeed} knots
最低气压: ${typhoon.minPressure} hPa
类别: ${typhoon.category}

请提供针对政府、企业和个人的防灾建议。`

  const response = await callMIMOAPI(prompt, systemPrompt)
  const content = response.choices[0]?.message?.content

  try {
    const jsonMatch = content?.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse suggestions:', e)
  }

  return [
    {
      category: '政府',
      priority: riskLevel === 'EXTREME' ? 'critical' : 'high',
      title: '启动应急预案',
      description: '根据台风强度启动相应级别应急预案',
      actions: ['组织人员转移', '准备救灾物资', '加强监测预警']
    },
    {
      category: '公众',
      priority: 'high',
      title: '做好个人防护',
      description: '台风期间注意个人安全',
      actions: ['减少外出', '储备食物饮水', '关注官方信息']
    }
  ]
}

export async function generateFullReport(typhoon: TyphoonData): Promise<AIAnalysis> {
  const [pathPrediction, landingProbability, cityImpact, riskLevel, suggestions] = await Promise.all([
    analyzeTyphoonPath(typhoon),
    calculateLandingProbability(typhoon),
    analyzeCityImpact(typhoon),
    assessRiskLevel(typhoon),
    generateSuggestions(typhoon, 'MODERATE')
  ])

  const updatedSuggestions = await generateSuggestions(typhoon, riskLevel)

  const summary = `台风${typhoon.name}分析报告：
当前位于${typhoon.currentLat}°N, ${typhoon.currentLng}°E，最大风速${typhoon.maxWindSpeed} knots，最低气压${typhoon.minPressure} hPa。
风险等级：${riskLevel}
预计路径：向${pathPrediction.trend}方向移动，速度${pathPrediction.speed} knots
登陆概率：${landingProbability.probability}%
可能影响城市：${cityImpact.map(c => c.city).join('、')}`

  return {
    id: '',
    typhoonId: typhoon.id,
    analysisType: 'FULL_REPORT',
    summary,
    pathPrediction,
    landingProbability,
    cityImpact,
    riskLevel,
    suggestions: updatedSuggestions,
    createdAt: new Date().toISOString()
  }
}
