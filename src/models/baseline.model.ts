/**
 * 基线数据模型定义
 */

import { PlatformType } from './traffic.model';

/**
 * 基线计算模式
 */
export enum BaselineMode {
  DAILY = 'daily',     // 日均值
  WEEKLY = 'weekly',   // 周均值
  MONTHLY = 'monthly', // 月均值
}

/**
 * 基线数据接口
 */
export interface BaselineData {
  /** 唯一标识符 */
  id?: string;

  /** 平台类型 */
  platform: PlatformType;

  /** 基线计算模式 */
  mode: BaselineMode;

  /** 基线计算的时间范围 */
  period: {
    start: Date;
    end: Date;
  };

  /** 基线值 */
  values: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 标准差 */
  standardDeviation: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 样本数量 */
  sampleSize: number;

  /** 置信度（百分比） */
  confidence: number;

  /** 异常阈值 */
  anomalyThreshold: {
    upper: {
      pageViews: number;
      uniqueVisitors: number;
      sessions: number;
    };
    lower: {
      pageViews: number;
      uniqueVisitors: number;
      sessions: number;
    };
  };

  /** 创建时间 */
  createdAt?: Date;

  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 异常检测结果
 */
export interface AnomalyDetectionResult {
  /** 是否为异常 */
  isAnomaly: boolean;

  /** 异常类型 */
  type?: 'spike' | 'drop' | 'pattern';

  /** 异常指标 */
  anomalousMetrics?: string[];

  /** 偏差程度（标准差的倍数） */
  deviation?: number;

  /** 置信度 */
  confidence?: number;

  /** 详细说明 */
  description?: string;
}

/**
 * 基线对比结果
 */
export interface BaselineComparison {
  /** 当前值 */
  current: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 基线值 */
  baseline: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 变化率（百分比） */
  changeRate: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 偏差（标准差倍数） */
  deviation: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
  };

  /** 异常检测结果 */
  anomalyDetection: AnomalyDetectionResult;
}

/**
 * 基线计算配置
 */
export interface BaselineConfig {
  /** 计算模式 */
  mode: BaselineMode;

  /** 最小样本数 */
  minSampleSize: number;

  /** 异常检测阈值（标准差倍数） */
  anomalyThresholdMultiplier: number;

  /** 是否排除异常值 */
  excludeOutliers: boolean;

  /** 置信度水平 */
  confidenceLevel: number;
}

/**
 * 默认基线配置
 */
export const DEFAULT_BASELINE_CONFIG: BaselineConfig = {
  mode: BaselineMode.WEEKLY,
  minSampleSize: 7,
  anomalyThresholdMultiplier: 2,
  excludeOutliers: true,
  confidenceLevel: 0.95,
};