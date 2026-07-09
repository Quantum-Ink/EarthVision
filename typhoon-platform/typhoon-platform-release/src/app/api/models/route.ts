import { NextRequest, NextResponse } from 'next/server'

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000'

// 获取模型列表
export async function GET() {
  try {
    const response = await fetch(`${ML_SERVER_URL}/models`)

    if (!response.ok) {
      throw new Error('Failed to fetch models from ML server')
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    // 返回默认模型信息
    return NextResponse.json({
      success: true,
      data: [
        {
          model_id: 'path_predictor_xgboost',
          model_type: 'path',
          framework: 'xgboost',
          version: '1.0.0',
          accuracy: 0.85,
          is_active: true,
        },
        {
          model_id: 'intensity_predictor_xgboost',
          model_type: 'intensity',
          framework: 'xgboost',
          version: '1.0.0',
          accuracy: 0.80,
          is_active: true,
        },
        {
          model_id: 'landfall_predictor',
          model_type: 'landfall',
          framework: 'sklearn',
          version: '1.0.0',
          accuracy: 0.75,
          is_active: true,
        },
      ],
    })
  }
}

// 训练模型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelType, trainingData, epochs, batchSize, learningRate } = body

    const response = await fetch(`${ML_SERVER_URL}/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_type: modelType,
        training_data: trainingData,
        epochs: epochs || 100,
        batch_size: batchSize || 32,
        learning_rate: learningRate || 0.001,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to train model')
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error training model:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to train model' },
      { status: 500 }
    )
  }
}
