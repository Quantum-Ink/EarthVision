"""
数据处理工具
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional


class DataProcessor:
    """数据处理器"""

    def __init__(self):
        self.required_columns = ['lat', 'lng', 'wind', 'pressure', 'timestamp']

    def process(self, df: pd.DataFrame) -> pd.DataFrame:
        """处理数据"""
        # 检查必需列
        missing_cols = [col for col in self.required_columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")

        # 复制数据
        processed = df.copy()

        # 数据清洗
        processed = self._clean_data(processed)

        # 数据转换
        processed = self._transform_data(processed)

        # 数据验证
        processed = self._validate_data(processed)

        return processed

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """清洗数据"""
        # 删除重复行
        df = df.drop_duplicates()

        # 处理缺失值
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

        # 处理异常值
        for col in ['wind', 'pressure']:
            if col in df.columns:
                df = self._remove_outliers(df, col)

        return df

    def _transform_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """转换数据"""
        # 转换时间戳
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_year'] = df['timestamp'].dt.dayofyear

        # 计算移动特征
        if len(df) > 1:
            df['lat_diff'] = df['lat'].diff()
            df['lng_diff'] = df['lng'].diff()
            df['wind_diff'] = df['wind'].diff()
            df['pressure_diff'] = df['pressure'].diff()

            # 计算移动速度和方向
            df['movement_speed'] = np.sqrt(df['lat_diff']**2 + df['lng_diff']**2) * 111  # km
            df['movement_dir'] = np.degrees(np.arctan2(df['lng_diff'], df['lat_diff'])) % 360

        return df

    def _validate_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """验证数据"""
        # 验证经纬度范围
        df = df[(df['lat'] >= -90) & (df['lat'] <= 90)]
        df = df[(df['lng'] >= -180) & (df['lng'] <= 180)]

        # 验证风速范围
        if 'wind' in df.columns:
            df = df[(df['wind'] >= 0) & (df['wind'] <= 200)]

        # 验证气压范围
        if 'pressure' in df.columns:
            df = df[(df['pressure'] >= 800) & (df['pressure'] <= 1100)]

        return df

    def _remove_outliers(self, df: pd.DataFrame, column: str) -> pd.DataFrame:
        """移除异常值"""
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        return df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]

    def interpolate(self, df: pd.DataFrame, interval: str = '6H') -> pd.DataFrame:
        """插值到固定时间间隔"""
        if 'timestamp' not in df.columns:
            return df

        df = df.set_index('timestamp')
        df = df.resample(interval).interpolate(method='linear')
        df = df.reset_index()

        return df

    def calculate_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """计算统计信息"""
        stats = {}

        for col in ['wind', 'pressure', 'lat', 'lng']:
            if col in df.columns:
                stats[col] = {
                    'mean': float(df[col].mean()),
                    'std': float(df[col].std()),
                    'min': float(df[col].min()),
                    'max': float(df[col].max()),
                    'median': float(df[col].median())
                }

        return stats
