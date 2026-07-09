"""
AI台风预测 - Python ML服务器
基于FastAPI的机器学习推理服务
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
import os
import uvicorn

# 导入模型模块
from models.path_predictor import PathPredictor
from models.intensity_predictor import IntensityPredictor
from models.landfall_predictor import LandfallPredictor
from models.ensemble_model import EnsembleModel
from utils.data_processor import DataProcessor
from utils.feature_engineer import FeatureEngineer

app = FastAPI(
    title="AI台风预测 ML服务",
    description="基于机器学习的台风路径和强度预测服务",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化模型
path_predictor = PathPredictor()
intensity_predictor = IntensityPredictor()
landfall_predictor = LandfallPredictor()
ensemble_model = EnsembleModel()
data_processor = DataProcessor()
feature_engineer = FeatureEngineer()


# 数据模型
class ForecastPoint(BaseModel):
    latitude: float
    longitude: float
    wind_speed: float
    pressure: float
    category: str
    movement_speed: Optional[float] = None
    movement_dir: Optional[str] = None
    radius7kt: Optional[float] = None
    radius10kt: Optional[float] = None
    radius12kt: Optional[float] = None
    forecast_hour: int = 0
    timestamp: str
    confidence: Optional[float] = None


class PredictionRequest(BaseModel):
    typhoon_id: str
    name: str
    basin: str = "WP"
    current_lat: float
    current_lng: float
    current_wind: float
    current_pressure: float
    history: List[ForecastPoint]
    forecast_hours: List[int] = [6, 12, 18, 24, 36, 48, 72, 96, 120]
    model_type: str = "ensemble"


class PredictionResponse(BaseModel):
    typhoon_id: str
    predictions: List[ForecastPoint]
    confidence: float
    model_version: str
    processing_time: float


class TrainingRequest(BaseModel):
    model_type: str
    training_data: List[Dict[str, Any]]
    epochs: int = 100
    batch_size: int = 32
    learning_rate: float = 0.001


class TrainingResponse(BaseModel):
    model_id: str
    status: str
    metrics: Dict[str, float]
    message: str


class ModelInfo(BaseModel):
    model_id: str
    model_type: str
    framework: str
    version: str
    accuracy: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    created_at: str
    is_active: bool


# API路由
@app.get("/")
async def root():
    return {
        "service": "AI台风预测 ML服务",
        "version": "1.0.0",
        "status": "running",
        "models": {
            "path_predictor": path_predictor.is_loaded(),
            "intensity_predictor": intensity_predictor.is_loaded(),
            "landfall_predictor": landfall_predictor.is_loaded(),
            "ensemble_model": ensemble_model.is_loaded()
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/predict/path", response_model=PredictionResponse)
async def predict_path(request: PredictionRequest):
    """预测台风路径"""
    try:
        start_time = datetime.now()

        # 准备数据
        history_data = [
            {
                "lat": p.latitude,
                "lng": p.longitude,
                "wind": p.wind_speed,
                "pressure": p.pressure,
                "hour": p.forecast_hour
            }
            for p in request.history
        ]

        # 特征工程
        features = feature_engineer.extract_features(history_data)

        # 路径预测
        predictions = path_predictor.predict(
            current_lat=request.current_lat,
            current_lng=request.current_lng,
            current_wind=request.current_wind,
            current_pressure=request.current_pressure,
            history=history_data,
            forecast_hours=request.forecast_hours,
            features=features
        )

        # 转换为响应格式
        forecast_points = []
        for pred in predictions:
            forecast_points.append(ForecastPoint(
                latitude=pred["lat"],
                longitude=pred["lng"],
                wind_speed=pred["wind"],
                pressure=pred["pressure"],
                category=pred["category"],
                movement_speed=pred.get("movement_speed"),
                movement_dir=pred.get("movement_dir"),
                forecast_hour=pred["hour"],
                timestamp=(datetime.now() + timedelta(hours=pred["hour"])).isoformat(),
                confidence=pred.get("confidence", 0.8)
            ))

        processing_time = (datetime.now() - start_time).total_seconds()

        return PredictionResponse(
            typhoon_id=request.typhoon_id,
            predictions=forecast_points,
            confidence=np.mean([p.confidence or 0.8 for p in forecast_points]),
            model_version=path_predictor.version,
            processing_time=processing_time
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/intensity")
async def predict_intensity(request: PredictionRequest):
    """预测台风强度"""
    try:
        history_data = [
            {
                "lat": p.latitude,
                "lng": p.longitude,
                "wind": p.wind_speed,
                "pressure": p.pressure,
                "hour": p.forecast_hour
            }
            for p in request.history
        ]

        features = feature_engineer.extract_features(history_data)

        predictions = intensity_predictor.predict(
            current_wind=request.current_wind,
            current_pressure=request.current_pressure,
            lat=request.current_lat,
            lng=request.current_lng,
            history=history_data,
            forecast_hours=request.forecast_hours,
            features=features
        )

        return {
            "typhoon_id": request.typhoon_id,
            "predictions": predictions,
            "model_version": intensity_predictor.version
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/landfall")
async def predict_landfall(request: PredictionRequest):
    """预测登陆概率"""
    try:
        history_data = [
            {
                "lat": p.latitude,
                "lng": p.longitude,
                "wind": p.wind_speed,
                "pressure": p.pressure,
                "hour": p.forecast_hour
            }
            for p in request.history
        ]

        features = feature_engineer.extract_features(history_data)

        result = landfall_predictor.predict(
            current_lat=request.current_lat,
            current_lng=request.current_lng,
            current_wind=request.current_wind,
            history=history_data,
            features=features
        )

        return {
            "typhoon_id": request.typhoon_id,
            "landfall_probability": result["probability"],
            "possible_locations": result["locations"],
            "timeframe": result["timeframe"],
            "model_version": landfall_predictor.version
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/ensemble")
async def predict_ensemble(request: PredictionRequest):
    """集成模型预测"""
    try:
        start_time = datetime.now()

        history_data = [
            {
                "lat": p.latitude,
                "lng": p.longitude,
                "wind": p.wind_speed,
                "pressure": p.pressure,
                "hour": p.forecast_hour
            }
            for p in request.history
        ]

        features = feature_engineer.extract_features(history_data)

        # 集成多个模型的预测
        result = ensemble_model.predict(
            current_lat=request.current_lat,
            current_lng=request.current_lng,
            current_wind=request.current_wind,
            current_pressure=request.current_pressure,
            history=history_data,
            forecast_hours=request.forecast_hours,
            features=features
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        return {
            "typhoon_id": request.typhoon_id,
            "path_predictions": result["path"],
            "intensity_predictions": result["intensity"],
            "landfall_probability": result["landfall"],
            "confidence": result["confidence"],
            "model_weights": result["weights"],
            "model_version": ensemble_model.version,
            "processing_time": processing_time
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest):
    """训练模型"""
    try:
        # 准备训练数据
        df = pd.DataFrame(request.training_data)

        if request.model_type == "path":
            model_id, metrics = path_predictor.train(
                data=df,
                epochs=request.epochs,
                batch_size=request.batch_size,
                learning_rate=request.learning_rate
            )
        elif request.model_type == "intensity":
            model_id, metrics = intensity_predictor.train(
                data=df,
                epochs=request.epochs,
                batch_size=request.batch_size,
                learning_rate=request.learning_rate
            )
        elif request.model_type == "landfall":
            model_id, metrics = landfall_predictor.train(
                data=df,
                epochs=request.epochs,
                batch_size=request.batch_size,
                learning_rate=request.learning_rate
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")

        return TrainingResponse(
            model_id=model_id,
            status="completed",
            metrics=metrics,
            message=f"Model {request.model_type} trained successfully"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """列出所有模型"""
    models = []

    models.append(ModelInfo(
        model_id=path_predictor.model_id,
        model_type="path",
        framework=path_predictor.framework,
        version=path_predictor.version,
        accuracy=path_predictor.accuracy,
        mae=path_predictor.mae,
        rmse=path_predictor.rmse,
        created_at=path_predictor.created_at,
        is_active=path_predictor.is_loaded()
    ))

    models.append(ModelInfo(
        model_id=intensity_predictor.model_id,
        model_type="intensity",
        framework=intensity_predictor.framework,
        version=intensity_predictor.version,
        accuracy=intensity_predictor.accuracy,
        mae=intensity_predictor.mae,
        rmse=intensity_predictor.rmse,
        created_at=intensity_predictor.created_at,
        is_active=intensity_predictor.is_loaded()
    ))

    models.append(ModelInfo(
        model_id=landfall_predictor.model_id,
        model_type="landfall",
        framework=landfall_predictor.framework,
        version=landfall_predictor.version,
        accuracy=landfall_predictor.accuracy,
        mae=landfall_predictor.mae,
        rmse=landfall_predictor.rmse,
        created_at=landfall_predictor.created_at,
        is_active=landfall_predictor.is_loaded()
    ))

    return models


@app.post("/models/{model_type}/load")
async def load_model(model_type: str, version: Optional[str] = None):
    """加载指定版本的模型"""
    try:
        if model_type == "path":
            path_predictor.load(version)
        elif model_type == "intensity":
            intensity_predictor.load(version)
        elif model_type == "landfall":
            landfall_predictor.load(version)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {model_type}")

        return {"status": "success", "message": f"Model {model_type} loaded"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/{model_type}/save")
async def save_model(model_type: str, version: str):
    """保存模型"""
    try:
        if model_type == "path":
            path_predictor.save(version)
        elif model_type == "intensity":
            intensity_predictor.save(version)
        elif model_type == "landfall":
            landfall_predictor.save(version)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {model_type}")

        return {"status": "success", "message": f"Model {model_type} saved as {version}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate/{model_type}")
async def evaluate_model(model_type: str, test_data: List[Dict[str, Any]]):
    """评估模型"""
    try:
        df = pd.DataFrame(test_data)

        if model_type == "path":
            metrics = path_predictor.evaluate(df)
        elif model_type == "intensity":
            metrics = intensity_predictor.evaluate(df)
        elif model_type == "landfall":
            metrics = landfall_predictor.evaluate(df)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {model_type}")

        return {
            "model_type": model_type,
            "metrics": metrics
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/features/extract")
async def extract_features(data: List[Dict[str, Any]]):
    """提取特征"""
    try:
        features = feature_engineer.extract_features(data)
        return {"features": features}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/data/process")
async def process_data(file: UploadFile = File(...)):
    """处理上传的数据文件"""
    try:
        content = await file.read()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(pd.io.common.BytesIO(content))
        elif file.filename.endswith('.json'):
            df = pd.read_json(pd.io.common.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        processed = data_processor.process(df)

        return {
            "rows": len(processed),
            "columns": list(processed.columns),
            "sample": processed.head(5).to_dict(orient='records')
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
