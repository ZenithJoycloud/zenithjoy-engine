/**
 * 基线计算引擎
 */

import { TrafficData, PlatformType } from '../models/traffic.model';
import {
  BaselineData,
  BaselineMode,
  BaselineConfig,
  DEFAULT_BASELINE_CONFIG,
} from '../models/baseline.model';

/**
 * 统计计算结果
 */
interface Statistics {
  mean: number;
  standardDeviation: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

/**
 * 基线计算引擎
 */
export class BaselineEngine {
  private config: BaselineConfig;

  /**
   * 构造函数
   * @param config 基线配置
   */
  constructor(config: Partial<BaselineConfig> = {}) {
    this.config = { ...DEFAULT_BASELINE_CONFIG, ...config };
  }

  /**
   * 计算基线
   * @param data 流量数据
   * @param platform 平台类型
   * @param mode 计算模式
   * @returns 基线数据
   */
  calculateBaseline(
    data: TrafficData[],
    platform: PlatformType,
    mode: BaselineMode = this.config.mode
  ): BaselineData | null {
    // 检查最小样本数
    if (data.length < this.config.minSampleSize) {
      console.warn(
        `Insufficient data for baseline calculation. Required: ${this.config.minSampleSize}, Got: ${data.length}`
      );
      return null;
    }

    // 过滤异常值（如果配置）
    let filteredData = data;
    if (this.config.excludeOutliers) {
      filteredData = this.filterOutliers(data);
    }

    // 提取各指标数组
    const pageViews = filteredData.map(d => d.pageViews);
    const uniqueVisitors = filteredData.map(d => d.uniqueVisitors);
    const sessions = filteredData.map(d => d.sessions);
    const avgSessionDuration = filteredData.map(d => d.avgSessionDuration);
    const bounceRate = filteredData.map(d => d.bounceRate);

    // 计算统计值
    const pageViewsStats = this.calculateStatistics(pageViews);
    const uniqueVisitorsStats = this.calculateStatistics(uniqueVisitors);
    const sessionsStats = this.calculateStatistics(sessions);
    const avgSessionDurationStats = this.calculateStatistics(avgSessionDuration);
    const bounceRateStats = this.calculateStatistics(bounceRate);

    // 确定时间范围
    const timestamps = filteredData.map(d => new Date(d.timestamp).getTime());
    const startDate = new Date(Math.min(...timestamps));
    const endDate = new Date(Math.max(...timestamps));

    // 构建基线数据
    const baseline: BaselineData = {
      platform,
      mode,
      period: {
        start: startDate,
        end: endDate,
      },
      values: {
        pageViews: pageViewsStats.mean,
        uniqueVisitors: uniqueVisitorsStats.mean,
        sessions: sessionsStats.mean,
        avgSessionDuration: avgSessionDurationStats.mean,
        bounceRate: bounceRateStats.mean,
      },
      standardDeviation: {
        pageViews: pageViewsStats.standardDeviation,
        uniqueVisitors: uniqueVisitorsStats.standardDeviation,
        sessions: sessionsStats.standardDeviation,
        avgSessionDuration: avgSessionDurationStats.standardDeviation,
        bounceRate: bounceRateStats.standardDeviation,
      },
      anomalyThreshold: {
        upper: {
          pageViews:
            pageViewsStats.mean +
            this.config.anomalyThresholdMultiplier * pageViewsStats.standardDeviation,
          uniqueVisitors:
            uniqueVisitorsStats.mean +
            this.config.anomalyThresholdMultiplier * uniqueVisitorsStats.standardDeviation,
          sessions:
            sessionsStats.mean +
            this.config.anomalyThresholdMultiplier * sessionsStats.standardDeviation,
        },
        lower: {
          pageViews: Math.max(
            0,
            pageViewsStats.mean -
              this.config.anomalyThresholdMultiplier * pageViewsStats.standardDeviation
          ),
          uniqueVisitors: Math.max(
            0,
            uniqueVisitorsStats.mean -
              this.config.anomalyThresholdMultiplier * uniqueVisitorsStats.standardDeviation
          ),
          sessions: Math.max(
            0,
            sessionsStats.mean -
              this.config.anomalyThresholdMultiplier * sessionsStats.standardDeviation
          ),
        },
      },
      sampleSize: filteredData.length,
      confidence: this.config.confidenceLevel * 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return baseline;
  }

  /**
   * 根据模式聚合数据
   * @param data 原始流量数据
   * @param mode 聚合模式
   * @returns 聚合后的数据
   */
  aggregateByMode(data: TrafficData[], mode: BaselineMode): TrafficData[] {
    const aggregated = new Map<string, TrafficData[]>();

    data.forEach(item => {
      const key = this.getAggregationKey(new Date(item.timestamp), mode);
      if (!aggregated.has(key)) {
        aggregated.set(key, []);
      }
      aggregated.get(key)!.push(item);
    });

    // 计算每个分组的平均值
    const result: TrafficData[] = [];
    aggregated.forEach((group, key) => {
      if (group.length === 0) return;

      const avgData: TrafficData = {
        platform: group[0].platform,
        timestamp: new Date(key),
        pageViews: this.average(group.map(d => d.pageViews)),
        uniqueVisitors: this.average(group.map(d => d.uniqueVisitors)),
        sessions: this.average(group.map(d => d.sessions)),
        avgSessionDuration: this.average(group.map(d => d.avgSessionDuration)),
        bounceRate: this.average(group.map(d => d.bounceRate)),
      };

      result.push(avgData);
    });

    return result;
  }

  /**
   * 计算统计值
   * @param values 数值数组
   * @returns 统计结果
   */
  private calculateStatistics(values: number[]): Statistics {
    if (values.length === 0) {
      return {
        mean: 0,
        standardDeviation: 0,
        min: 0,
        max: 0,
        median: 0,
        q1: 0,
        q3: 0,
      };
    }

    // 排序用于计算中位数和四分位数
    const sorted = [...values].sort((a, b) => a - b);

    // 计算平均值
    const mean = this.average(values);

    // 计算标准差
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = this.average(squaredDiffs);
    const standardDeviation = Math.sqrt(variance);

    // 计算中位数
    const median = this.percentile(sorted, 50);

    // 计算四分位数
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);

    return {
      mean,
      standardDeviation,
      min: Math.min(...values),
      max: Math.max(...values),
      median,
      q1,
      q3,
    };
  }

  /**
   * 过滤异常值（使用 IQR 方法）
   * @param data 原始数据
   * @returns 过滤后的数据
   */
  private filterOutliers(data: TrafficData[]): TrafficData[] {
    if (data.length < 4) return data;

    // 使用页面浏览量作为主要指标进行异常值检测
    const pageViews = data.map(d => d.pageViews).sort((a, b) => a - b);
    const q1 = this.percentile(pageViews, 25);
    const q3 = this.percentile(pageViews, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(item => {
      return item.pageViews >= lowerBound && item.pageViews <= upperBound;
    });
  }

  /**
   * 计算百分位数
   * @param sortedValues 已排序的数值数组
   * @param percentile 百分位（0-100）
   * @returns 百分位数值
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * 计算平均值
   * @param values 数值数组
   * @returns 平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 获取聚合键
   * @param date 日期
   * @param mode 模式
   * @returns 聚合键字符串
   */
  private getAggregationKey(date: Date, mode: BaselineMode): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (mode) {
      case BaselineMode.DAILY:
        return `${year}-${month}-${day}`;

      case BaselineMode.WEEKLY:
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;

      case BaselineMode.MONTHLY:
        return `${year}-${month}`;

      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  updateConfig(config: Partial<BaselineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): BaselineConfig {
    return { ...this.config };
  }
}