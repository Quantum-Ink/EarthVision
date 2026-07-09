"""
台风强度预测模型
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import os
import joblib

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False


class IntensityPredictor:
    """台风强度预测器"""

    def __init__(self, framework: str = "xgboost"):
        self.framework = framework
        self.model = None
        self.model_id = f"intensity_predictor_{framework}"
        self.version = "1.0.0"
        self.created_at = datetime.now().isoformat()
        self.accuracy = None
        self.mae = None
        self.rmse = None

        self.model_dir = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'intensity')
        os.makedirs(self.model_dir, exist_ok=True)

        self._init_model()

    def _init_model(self):
        """初始化模型"""
        if self.framework == "xgboost" and HAS_XGBOOST:
            self.model = xgb.XGBRegressor(
                n_estimators=300,
                max_depth=6,
                learning_rate=0.05,
                objective='reg:squarederror'
            )
        elif self.framework == "lightgbm" and HAS_LIGHTGBM:
            self.model = lgb.LGBMRegressor(
                n_estimators=300,
                max_depth=6,
                learning_rate=0.05
            )
        else:
            from sklearn.ensemble import GradientBoostingRegressor
            self.model = GradientBoostingRegressor(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.1
            )

    def is_loaded(self) -> bool:
        return self.model is not None

    def predict(
        self,
        current_wind: float,
        current_pressure: float,
        lat: float,
        lng: float,
        history: List[Dict],
        forecast_hours: List[int],
        features: Dict[str, Any]
    ) -> List[Dict]:
        """预测强度"""
        predictions = []

        for hour in forecast_hours:
            try:
                # 提取特征
                X = self._extract_features(current_wind, current_pressure, lat, lng, history, hour, features)

                if hasattr(self.model, 'predict'):
                    pred = self.model.predict(X.reshape(1, -1))[0]
                    wind = max(15, current_wind + pred[0])
                    pressure = min(1020, max(880, current_pressure + pred[1]))
                else:
                    wind, pressure = self._statistical_prediction(current_wind, current_pressure, history, hour)

                predictions.append({
                    "wind": wind,
                    "pressure": pressure,
                    "category": self._classify_wind(wind),
                    "hour": hour,
                    "confidence": max(0.5, 1.0 - hour * 0.005)
                })

            except Exception as e:
                print(f"Intensity prediction error for hour {hour}: {e}")
                wind, pressure = self._statistical_prediction(current_wind, current_pressure, history, hour)
                predictions.append({
                    "wind": wind,
                    "pressure": pressure,
                    "category": self._classify_wind(wind),
                    "hour": hour,
                    "confidence": 0.6
                })

        return predictions

    def _extract_features(
        self,
        wind: float,
        pressure: float,
        lat: float,
        lng: float,
        history: List[Dict],
        hour: int,
        features: Dict
    ) -> np.ndarray:
        """提取特征"""
        feature_list = [
            wind, pressure, lat, lng, hour,
            features.get('wind_trend', 0),
            features.get('pressure_trend', 0),
            features.get('lat', lat),
            features.get('lng', lng),
            features.get('speed', 10),
        ]
        return np.array(feature_list, dtype=np.float32)

    def _statistical_prediction(
        self,
        wind: float,
        pressure: float,
        history: List[Dict],
        hour: int
    ) -> Tuple[float, float]:
        """统计方法预测"""
        if len(history) >= 2:
            wind_trend = (history[-1]['wind'] - history[0]['wind']) / len(history)
        else:
            wind_trend = 0

        progress = hour / 24
        pred_wind = wind + wind_trend * progress * 6

        # 添加强度波动
        np.random.seed(int(wind * 100 + hour))
        pred_wind += np.random.normal(0, 5 * progress)
        pred_wind = max(15, min(170, pred_wind))

        pred_pressure = pressure - (pred_wind - wind) * 0.5
        pred_pressure = min(1020, max(880, pred_pressure))

        return pred_wind, pred_pressure

    def _classify_wind(self, wind_speed: float) -> str:
        if wind_speed < 34:
            return 'TROPICAL_DEPRESSION'
        elif wind_speed < 48:
            return 'TROPICAL_STORM'
        elif wind_speed < 64:
            return 'SEVERE_TROPICAL_STORM'
        elif wind_speed < 90:
            return 'TYPHOON'
        elif wind_speed < 130:
            return 'SEVERE_TYPHOON'
        else:
            return 'SUPER_TYPHOON'

    def train(self, data: pd.DataFrame, epochs: int = 100, batch_size: int = 32, learning_rate: float = 0.001) -> Tuple[str, Dict]:
        """训练模型"""
        X, y = self._prepare_training_data(data)

        self.model.fit(X, y)
        predictions = self.model.predict(X)

        mae = np.mean(np.abs(predictions - y))
        rmse = np.sqrt(np.mean((predictions - y)**2))
        self.mae = float(mae)
        self.rmse = float(rmse)
        self.accuracy = max(0, 1 - mae / np.std(y))

        model_id = f"intensity_{self.framework}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        return model_id, {"mae": self.mae, "rmse": self.rmse, "accuracy": self.accuracy}

    def _prepare_training_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        features = []
        targets = []

        for i in range(6, len(data)):
            X = data.iloc[i-6:i][['wind', 'pressure', 'lat', 'lng']].values.flatten()
            features.append(X)

            y = [
                data.iloc[i]['wind'] - data.iloc[i-1]['wind'],
                data.iloc[i]['pressure'] - data.iloc[i-1]['pressure']
            ]
            targets.append(y)

        return np.array(features), np.array(targets)

    def evaluate(self, test_data: pd.DataFrame) -> Dict:
        X, y = self._prepare_training_data(test_data)
        predictions = self.model.predict(X)

        mae = np.mean(np.abs(predictions - y))
        rmse = np.sqrt(np.mean((predictions - y)**2))

        return {"mae": float(mae), "rmse": float(rmse)}

    def save(self, version: str):
        path = os.path.join(self.model_dir, f"model_{version}.joblib")
        joblib.dump(self.model, path)
        self.version = version

    def load(self, version: Optional[str] = None):
        if version is None:
            files = os.listdir(self.model_dir)
            if not files:
                return
            path = os.path.join(self.model_dir, sorted(files)[-1])
        else:
            path = os.path.join(self.model_dir, f"model_{version}.joblib")

        if os.path.exists(path):
            self.model = joblib.load(path)
