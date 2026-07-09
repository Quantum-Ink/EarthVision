"""
特征工程工具
"""

import numpy as np
from typing import List, Dict, Any


class FeatureEngineer:
    """特征工程器"""

    def __init__(self):
        pass

    def extract_features(self, history: List[Dict]) -> Dict[str, Any]:
        """提取特征"""
        if not history:
            return self._default_features()

        features = {}

        # 当前状态特征
        current = history[-1]
        features['current_lat'] = current.get('lat', 0)
        features['current_lng'] = current.get('lng', 0)
        features['current_wind'] = current.get('wind', 0)
        features['current_pressure'] = current.get('pressure', 1000)

        # 趋势特征
        if len(history) >= 2:
            features['lat_trend'] = history[-1]['lat'] - history[-2]['lat']
            features['lng_trend'] = history[-1]['lng'] - history[-2]['lng']
            features['wind_trend'] = history[-1]['wind'] - history[-2]['wind']
            features['pressure_trend'] = history[-1]['pressure'] - history[-2]['pressure']
        else:
            features['lat_trend'] = 0
            features['lng_trend'] = 0
            features['wind_trend'] = 0
            features['pressure_trend'] = 0

        # 统计特征
        if len(history) >= 3:
            lats = [p['lat'] for p in history[-6:]]
            lngs = [p['lng'] for p in history[-6:]]
            winds = [p['wind'] for p in history[-6:]]

            features['lat_mean'] = np.mean(lats)
            features['lng_mean'] = np.mean(lngs)
            features['wind_mean'] = np.mean(winds)
            features['lat_std'] = np.std(lats)
            features['lng_std'] = np.std(lngs)
            features['wind_std'] = np.std(winds)
        else:
            features['lat_mean'] = features['current_lat']
            features['lng_mean'] = features['current_lng']
            features['wind_mean'] = features['current_wind']
            features['lat_std'] = 0
            features['lng_std'] = 0
            features['wind_std'] = 0

        # 移动特征
        features['speed'] = self._calculate_speed(history)
        features['direction'] = self._calculate_direction(history)
        features['direction_encoded'] = self._encode_direction(features['direction'])

        # 加速度特征
        features['acceleration'] = self._calculate_acceleration(history)

        # 曲率特征
        features['curvature'] = self._calculate_curvature(history)

        return features

    def _default_features(self) -> Dict[str, Any]:
        """默认特征"""
        return {
            'current_lat': 0,
            'current_lng': 0,
            'current_wind': 0,
            'current_pressure': 1000,
            'lat_trend': 0,
            'lng_trend': 0,
            'wind_trend': 0,
            'pressure_trend': 0,
            'lat_mean': 0,
            'lng_mean': 0,
            'wind_mean': 0,
            'lat_std': 0,
            'lng_std': 0,
            'wind_std': 0,
            'speed': 0,
            'direction': 0,
            'direction_encoded': 0,
            'acceleration': 0,
            'curvature': 0
        }

    def _calculate_speed(self, history: List[Dict]) -> float:
        """计算移动速度"""
        if len(history) < 2:
            return 10.0

        p1 = history[-2]
        p2 = history[-1]

        distance = self._haversine(p1['lat'], p1['lng'], p2['lat'], p2['lng'])
        time_diff = 6  # 假设6小时间隔

        return distance / time_diff

    def _calculate_direction(self, history: List[Dict]) -> float:
        """计算移动方向"""
        if len(history) < 2:
            return 0.0

        p1 = history[-2]
        p2 = history[-1]

        dlat = p2['lat'] - p1['lat']
        dlng = p2['lng'] - p1['lng']

        angle = np.degrees(np.arctan2(dlng, dlat)) % 360
        return angle

    def _encode_direction(self, direction: float) -> float:
        """编码方向"""
        # 将方向编码为0-1之间的值
        return direction / 360

    def _calculate_acceleration(self, history: List[Dict]) -> float:
        """计算加速度"""
        if len(history) < 3:
            return 0.0

        speed1 = self._calculate_speed(history[:-1])
        speed2 = self._calculate_speed(history)

        return speed2 - speed1

    def _calculate_curvature(self, history: List[Dict]) -> float:
        """计算路径曲率"""
        if len(history) < 3:
            return 0.0

        p1 = history[-3]
        p2 = history[-2]
        p3 = history[-1]

        # 使用三点计算曲率
        x1, y1 = p1['lng'], p1['lat']
        x2, y2 = p2['lng'], p2['lat']
        x3, y3 = p3['lng'], p3['lat']

        # 计算三角形面积
        area = abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2

        # 计算边长
        a = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        b = np.sqrt((x3 - x2)**2 + (y3 - y2)**2)
        c = np.sqrt((x3 - x1)**2 + (y3 - y1)**2)

        # 计算曲率
        if a * b * c == 0:
            return 0.0

        curvature = 4 * area / (a * b * c)
        return curvature

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """计算两点间距离(km)"""
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c

    def create_feature_vector(self, features: Dict[str, Any]) -> List[float]:
        """创建特征向量"""
        feature_keys = [
            'current_lat', 'current_lng', 'current_wind', 'current_pressure',
            'lat_trend', 'lng_trend', 'wind_trend', 'pressure_trend',
            'speed', 'direction_encoded', 'acceleration', 'curvature'
        ]

        return [features.get(key, 0) for key in feature_keys]
