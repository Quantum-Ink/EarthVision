"""
集成预测模型
融合多个单一模型的预测结果
"""

import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

from .path_predictor import PathPredictor
from .intensity_predictor import IntensityPredictor
from .landfall_predictor import LandfallPredictor


class EnsembleModel:
    """集成预测模型"""

    def __init__(self):
        self.path_predictor = PathPredictor(framework="xgboost")
        self.intensity_predictor = IntensityPredictor(framework="xgboost")
        self.landfall_predictor = LandfallPredictor()

        self.model_id = "ensemble_model"
        self.version = "1.0.0"
        self.created_at = datetime.now().isoformat()

        # 模型权重
        self.weights = {
            "path": 0.4,
            "intensity": 0.3,
            "landfall": 0.3
        }

    def is_loaded(self) -> bool:
        return (
            self.path_predictor.is_loaded() and
            self.intensity_predictor.is_loaded() and
            self.landfall_predictor.is_loaded()
        )

    def predict(
        self,
        current_lat: float,
        current_lng: float,
        current_wind: float,
        current_pressure: float,
        history: List[Dict],
        forecast_hours: List[int],
        features: Dict[str, Any]
    ) -> Dict:
        """集成预测"""
        # 路径预测
        path_predictions = self.path_predictor.predict(
            current_lat=current_lat,
            current_lng=current_lng,
            current_wind=current_wind,
            current_pressure=current_pressure,
            history=history,
            forecast_hours=forecast_hours,
            features=features
        )

        # 强度预测
        intensity_predictions = self.intensity_predictor.predict(
            current_wind=current_wind,
            current_pressure=current_pressure,
            lat=current_lat,
            lng=current_lng,
            history=history,
            forecast_hours=forecast_hours,
            features=features
        )

        # 登陆预测
        landfall_result = self.landfall_predictor.predict(
            current_lat=current_lat,
            current_lng=current_lng,
            current_wind=current_wind,
            history=history,
            features=features
        )

        # 融合路径和强度预测
        combined_predictions = self._combine_predictions(path_predictions, intensity_predictions)

        # 计算总体置信度
        confidence = self._calculate_confidence(path_predictions, intensity_predictions, landfall_result)

        return {
            "path": combined_predictions,
            "intensity": intensity_predictions,
            "landfall": landfall_result,
            "confidence": confidence,
            "weights": self.weights
        }

    def _combine_predictions(
        self,
        path_preds: List[Dict],
        intensity_preds: List[Dict]
    ) -> List[Dict]:
        """融合路径和强度预测"""
        combined = []

        for i, (path, intensity) in enumerate(zip(path_preds, intensity_preds)):
            combined.append({
                "lat": path["lat"],
                "lng": path["lng"],
                "wind": (path["wind"] * self.weights["path"] + intensity["wind"] * self.weights["intensity"]) / (self.weights["path"] + self.weights["intensity"]),
                "pressure": (path["pressure"] * self.weights["path"] + intensity["pressure"] * self.weights["intensity"]) / (self.weights["path"] + self.weights["intensity"]),
                "category": path["category"],
                "movement_speed": path.get("movement_speed"),
                "movement_dir": path.get("movement_dir"),
                "hour": path["hour"],
                "confidence": (path.get("confidence", 0.8) + intensity.get("confidence", 0.8)) / 2
            })

        return combined

    def _calculate_confidence(
        self,
        path_preds: List[Dict],
        intensity_preds: List[Dict],
        landfall_result: Dict
    ) -> float:
        """计算总体置信度"""
        path_confidence = np.mean([p.get("confidence", 0.8) for p in path_preds])
        intensity_confidence = np.mean([p.get("confidence", 0.8) for p in intensity_preds])

        return (
            path_confidence * self.weights["path"] +
            intensity_confidence * self.weights["intensity"] +
            0.7 * self.weights["landfall"]
        )

    def update_weights(self, new_weights: Dict[str, float]):
        """更新模型权重"""
        total = sum(new_weights.values())
        self.weights = {k: v / total for k, v in new_weights.items()}
