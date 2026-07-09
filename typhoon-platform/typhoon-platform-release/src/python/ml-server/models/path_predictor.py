"""
台风路径预测模型
支持多种机器学习框架: PyTorch, TensorFlow, XGBoost, LightGBM
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json
import os
import joblib

# 尝试导入深度学习框架
try:
    import torch
    import torch.nn as nn
    HAS_PYTORCH = True
except ImportError:
    HAS_PYTORCH = False

try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False

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


# LSTM路径预测模型 (PyTorch)
if HAS_PYTORCH:
    class PathLSTM(nn.Module):
        def __init__(self, input_size=10, hidden_size=128, num_layers=3, output_size=4):
            super(PathLSTM, self).__init__()
            self.hidden_size = hidden_size
            self.num_layers = num_layers

            self.lstm = nn.LSTM(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                batch_first=True,
                dropout=0.2
            )

            self.attention = nn.MultiheadAttention(hidden_size, num_heads=4, batch_first=True)

            self.fc = nn.Sequential(
                nn.Linear(hidden_size, 64),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(64, output_size)
            )

        def forward(self, x):
            # LSTM编码
            lstm_out, _ = self.lstm(x)

            # 自注意力
            attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)

            # 取最后一个时间步
            out = attn_out[:, -1, :]

            # 全连接层
            out = self.fc(out)

            return out


class PathPredictor:
    """台风路径预测器"""

    def __init__(self, framework: str = "xgboost"):
        self.framework = framework
        self.model = None
        self.model_id = f"path_predictor_{framework}"
        self.version = "1.0.0"
        self.created_at = datetime.now().isoformat()
        self.accuracy = None
        self.mae = None
        self.rmse = None

        # 模型目录
        self.model_dir = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'path')
        os.makedirs(self.model_dir, exist_ok=True)

        # 初始化模型
        self._init_model()

    def _init_model(self):
        """初始化模型"""
        if self.framework == "xgboost" and HAS_XGBOOST:
            self.model = xgb.XGBRegressor(
                n_estimators=500,
                max_depth=8,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                objective='reg:squarederror',
                tree_method='hist'
            )
        elif self.framework == "lightgbm" and HAS_LIGHTGBM:
            self.model = lgb.LGBMRegressor(
                n_estimators=500,
                max_depth=8,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                objective='regression'
            )
        elif self.framework == "pytorch" and HAS_PYTORCH:
            self.model = PathLSTM()
        else:
            # 回退到简单线性模型
            from sklearn.linear_model import Ridge
            self.model = Ridge(alpha=1.0)

    def is_loaded(self) -> bool:
        return self.model is not None

    def predict(
        self,
        current_lat: float,
        current_lng: float,
        current_wind: float,
        current_pressure: float,
        history: List[Dict],
        forecast_hours: List[int],
        features: Dict[str, Any]
    ) -> List[Dict]:
        """预测路径"""
        predictions = []

        # 准备输入特征
        X = self._prepare_features(current_lat, current_lng, current_wind, current_pressure, history, features)

        # 对每个预报时效进行预测
        for hour in forecast_hours:
            try:
                # 使用模型预测
                if self.framework in ["xgboost", "lightgbm"] and hasattr(self.model, 'predict'):
                    pred = self.model.predict(X.reshape(1, -1))[0]
                    lat = current_lat + pred[0]
                    lng = current_lng + pred[1]
                    wind = max(15, current_wind + pred[2])
                    pressure = min(1020, max(880, current_pressure + pred[3]))
                else:
                    # 使用统计方法作为备选
                    lat, lng, wind, pressure = self._statistical_prediction(
                        current_lat, current_lng, current_wind, current_pressure, history, hour
                    )

                predictions.append({
                    "lat": lat,
                    "lng": lng,
                    "wind": wind,
                    "pressure": pressure,
                    "category": self._classify_wind(wind),
                    "movement_speed": self._calculate_movement_speed(predictions, lat, lng),
                    "movement_dir": self._calculate_movement_dir(predictions, lat, lng),
                    "hour": hour,
                    "confidence": max(0.5, 1.0 - hour * 0.004)
                })

            except Exception as e:
                print(f"Prediction error for hour {hour}: {e}")
                # 使用统计方法作为备选
                lat, lng, wind, pressure = self._statistical_prediction(
                    current_lat, current_lng, current_wind, current_pressure, history, hour
                )
                predictions.append({
                    "lat": lat,
                    "lng": lng,
                    "wind": wind,
                    "pressure": pressure,
                    "category": self._classify_wind(wind),
                    "hour": hour,
                    "confidence": 0.6
                })

        return predictions

    def _prepare_features(
        self,
        lat: float,
        lng: float,
        wind: float,
        pressure: float,
        history: List[Dict],
        features: Dict
    ) -> np.ndarray:
        """准备特征向量"""
        feature_list = [
            lat, lng, wind, pressure,
            features.get('lat_trend', 0),
            features.get('lng_trend', 0),
            features.get('wind_trend', 0),
            features.get('pressure_trend', 0),
            features.get('speed', 10),
            features.get('direction_encoded', 0),
        ]

        return np.array(feature_list, dtype=np.float32)

    def _statistical_prediction(
        self,
        lat: float,
        lng: float,
        wind: float,
        pressure: float,
        history: List[Dict],
        hour: int
    ) -> Tuple[float, float, float, float]:
        """统计方法预测"""
        # 计算历史移动趋势
        if len(history) >= 2:
            lat_trend = (history[-1]['lat'] - history[0]['lat']) / len(history)
            lng_trend = (history[-1]['lng'] - history[0]['lng']) / len(history)
            wind_trend = (history[-1]['wind'] - history[0]['wind']) / len(history)
        else:
            lat_trend = 0.1  # 默认向北
            lng_trend = -0.15  # 默认向西
            wind_trend = 0

        # 预测位置
        progress = hour / 24
        pred_lat = lat + lat_trend * progress * 6
        pred_lng = lng + lng_trend * progress * 6

        # 添加随机扰动
        np.random.seed(int(lat * 100 + lng * 100 + hour))
        pred_lat += np.random.normal(0, 0.2 * progress)
        pred_lng += np.random.normal(0, 0.2 * progress)

        # 预测强度
        pred_wind = wind + wind_trend * progress * 6
        pred_wind = max(15, min(170, pred_wind + np.random.normal(0, 5)))

        # 预测气压
        pred_pressure = pressure - (pred_wind - wind) * 0.5
        pred_pressure = min(1020, max(880, pred_pressure))

        return pred_lat, pred_lng, pred_wind, pred_pressure

    def _classify_wind(self, wind_speed: float) -> str:
        """分类风速"""
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

    def _calculate_movement_speed(self, predictions: List[Dict], lat: float, lng: float) -> float:
        """计算移动速度"""
        if not predictions:
            return 10.0

        prev = predictions[-1]
        distance = self._haversine(prev['lat'], prev['lng'], lat, lng)
        return distance / 6  # 6小时

    def _calculate_movement_dir(self, predictions: List[Dict], lat: float, lng: float) -> str:
        """计算移动方向"""
        if not predictions:
            return 'N'

        prev = predictions[-1]
        dlat = lat - prev['lat']
        dlng = lng - prev['lng']
        angle = np.degrees(np.arctan2(dlng, dlat)) % 360

        directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
        idx = round(angle / 22.5) % 16
        return directions[idx]

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """计算两点间距离(km)"""
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c

    def train(
        self,
        data: pd.DataFrame,
        epochs: int = 100,
        batch_size: int = 32,
        learning_rate: float = 0.001
    ) -> Tuple[str, Dict]:
        """训练模型"""
        # 准备训练数据
        X, y = self._prepare_training_data(data)

        if self.framework in ["xgboost", "lightgbm"]:
            # 树模型训练
            self.model.fit(X, y)
            predictions = self.model.predict(X)
        else:
            # 线性模型训练
            self.model.fit(X, y)
            predictions = self.model.predict(X)

        # 计算指标
        mae = np.mean(np.abs(predictions - y))
        rmse = np.sqrt(np.mean((predictions - y)**2))
        self.mae = float(mae)
        self.rmse = float(rmse)
        self.accuracy = max(0, 1 - mae / np.std(y))

        # 生成模型ID
        model_id = f"path_{self.framework}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        return model_id, {
            "mae": self.mae,
            "rmse": self.rmse,
            "accuracy": self.accuracy
        }

    def _prepare_training_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """准备训练数据"""
        # 简化实现：使用滑动窗口
        features = []
        targets = []

        for i in range(6, len(data)):
            # 特征: 过去6个时间步
            X = data.iloc[i-6:i][['lat', 'lng', 'wind', 'pressure']].values.flatten()
            features.append(X)

            # 目标: 下一个时间步的位置和强度变化
            y = [
                data.iloc[i]['lat'] - data.iloc[i-1]['lat'],
                data.iloc[i]['lng'] - data.iloc[i-1]['lng'],
                data.iloc[i]['wind'] - data.iloc[i-1]['wind'],
                data.iloc[i]['pressure'] - data.iloc[i-1]['pressure']
            ]
            targets.append(y)

        return np.array(features), np.array(targets)

    def evaluate(self, test_data: pd.DataFrame) -> Dict:
        """评估模型"""
        X, y = self._prepare_training_data(test_data)
        predictions = self.model.predict(X)

        mae = np.mean(np.abs(predictions - y))
        rmse = np.sqrt(np.mean((predictions - y)**2))

        return {
            "mae": float(mae),
            "rmse": float(rmse),
            "r2": float(1 - np.sum((predictions - y)**2) / np.sum((y - np.mean(y))**2))
        }

    def save(self, version: str):
        """保存模型"""
        path = os.path.join(self.model_dir, f"model_{version}.joblib")
        joblib.dump(self.model, path)
        self.version = version

    def load(self, version: Optional[str] = None):
        """加载模型"""
        if version is None:
            # 加载最新版本
            files = os.listdir(self.model_dir)
            if not files:
                return
            path = os.path.join(self.model_dir, sorted(files)[-1])
        else:
            path = os.path.join(self.model_dir, f"model_{version}.joblib")

        if os.path.exists(path):
            self.model = joblib.load(path)
