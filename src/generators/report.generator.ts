/**
 * 报告生成器
 */

import { TrafficData, TrafficSummary, PlatformType } from '../models/traffic.model';
import { BaselineData, BaselineComparison, AnomalyDetectionResult } from '../models/baseline.model';
import { AnomalyDetector } from '../engines/anomaly.detector';

/**
 * 报告格式枚举
 */
export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  PDF = 'pdf',
}

/**
 * 报告配置
 */
export interface ReportConfig {
  title?: string;
  format?: ReportFormat;
  includeCharts?: boolean;
  includeAnomalies?: boolean;
  includeBaseline?: boolean;
  includeRecommendations?: boolean;
}

/**
 * 月度报告数据
 */
export interface MonthlyReport {
  /** 报告元数据 */
  metadata: {
    title: string;
    generatedAt: Date;
    period: {
      start: Date;
      end: Date;
    };
    version: string;
  };

  /** 概览 */
  overview: {
    totalPageViews: number;
    totalUniqueVisitors: number;
    totalSessions: number;
    avgBounceRate: number;
    dataQuality: number;
    platformCount: number;
  };

  /** 各平台汇总 */
  platformSummaries: TrafficSummary[];

  /** 基线对比 */
  baselineComparisons?: Array<{
    platform: PlatformType;
    comparison: BaselineComparison;
  }>;

  /** 异常检测结果 */
  anomalies?: Array<{
    platform: PlatformType;
    timestamp: Date;
    detection: AnomalyDetectionResult;
    data: TrafficData;
  }>;

  /** 趋势分析 */
  trends: {
    platform: PlatformType;
    direction: 'up' | 'down' | 'stable';
    changeRate: number;
    description: string;
  }[];

  /** 建议 */
  recommendations?: string[];

  /** 原始数据（可选） */
  rawData?: TrafficData[];
}

/**
 * 报告生成器
 */
export class ReportGenerator {
  private anomalyDetector: AnomalyDetector;
  private config: ReportConfig;

  /**
   * 构造函数
   * @param config 报告配置
   */
  constructor(config: ReportConfig = {}) {
    this.config = {
      title: 'Platform Traffic Monthly Report',
      format: ReportFormat.JSON,
      includeCharts: false,
      includeAnomalies: true,
      includeBaseline: true,
      includeRecommendations: true,
      ...config,
    };
    this.anomalyDetector = new AnomalyDetector();
  }

  /**
   * 生成月度报告
   * @param data 流量数据
   * @param baselines 基线数据映射
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 月度报告
   */
  async generateMonthlyReport(
    data: TrafficData[],
    baselines: Map<PlatformType, BaselineData>,
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyReport> {
    // 按平台分组数据
    const dataByPlatform = this.groupDataByPlatform(data);

    // 生成平台汇总
    const platformSummaries = await this.generatePlatformSummaries(
      dataByPlatform,
      startDate,
      endDate
    );

    // 计算总体概览
    const overview = this.calculateOverview(platformSummaries, data);

    // 基线对比
    const baselineComparisons = this.config.includeBaseline
      ? this.generateBaselineComparisons(dataByPlatform, baselines)
      : undefined;

    // 异常检测
    const anomalies = this.config.includeAnomalies
      ? this.detectAllAnomalies(data, baselines)
      : undefined;

    // 趋势分析
    const trends = this.analyzeTrends(dataByPlatform);

    // 生成建议
    const recommendations = this.config.includeRecommendations
      ? this.generateRecommendations(anomalies, trends, overview)
      : undefined;

    // 构建报告
    const report: MonthlyReport = {
      metadata: {
        title: this.config.title || 'Platform Traffic Monthly Report',
        generatedAt: new Date(),
        period: {
          start: startDate,
          end: endDate,
        },
        version: '1.0.0',
      },
      overview,
      platformSummaries,
      baselineComparisons,
      anomalies,
      trends,
      recommendations,
    };

    // 根据格式生成报告
    return this.formatReport(report);
  }

  /**
   * 按平台分组数据
   * @param data 流量数据数组
   * @returns 分组后的数据
   */
  private groupDataByPlatform(data: TrafficData[]): Map<PlatformType, TrafficData[]> {
    const grouped = new Map<PlatformType, TrafficData[]>();

    data.forEach(item => {
      if (!grouped.has(item.platform)) {
        grouped.set(item.platform, []);
      }
      grouped.get(item.platform)!.push(item);
    });

    return grouped;
  }

  /**
   * 生成平台汇总
   * @param dataByPlatform 按平台分组的数据
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 平台汇总数组
   */
  private async generatePlatformSummaries(
    dataByPlatform: Map<PlatformType, TrafficData[]>,
    startDate: Date,
    endDate: Date
  ): Promise<TrafficSummary[]> {
    const summaries: TrafficSummary[] = [];

    dataByPlatform.forEach((platformData, platform) => {
      const summary: TrafficSummary = {
        platform,
        period: { start: startDate, end: endDate },
        totalPageViews: platformData.reduce((sum, d) => sum + d.pageViews, 0),
        totalUniqueVisitors: platformData.reduce((sum, d) => sum + d.uniqueVisitors, 0),
        totalSessions: platformData.reduce((sum, d) => sum + d.sessions, 0),
        avgSessionDuration:
          platformData.reduce((sum, d) => sum + d.avgSessionDuration, 0) / platformData.length,
        avgBounceRate:
          platformData.reduce((sum, d) => sum + d.bounceRate, 0) / platformData.length,
        dataPoints: platformData.length,
      };

      summaries.push(summary);
    });

    return summaries;
  }

  /**
   * 计算总体概览
   * @param summaries 平台汇总
   * @param data 原始数据
   * @returns 概览数据
   */
  private calculateOverview(
    summaries: TrafficSummary[],
    data: TrafficData[]
  ): MonthlyReport['overview'] {
    const totalPageViews = summaries.reduce((sum, s) => sum + s.totalPageViews, 0);
    const totalUniqueVisitors = summaries.reduce((sum, s) => sum + s.totalUniqueVisitors, 0);
    const totalSessions = summaries.reduce((sum, s) => sum + s.totalSessions, 0);

    const avgBounceRate =
      summaries.reduce((sum, s) => sum + s.avgBounceRate, 0) / (summaries.length || 1);

    // 计算数据质量
    const qualityScores = data
      .filter(d => d.qualityScore !== undefined)
      .map(d => d.qualityScore!);
    const dataQuality =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : 100;

    return {
      totalPageViews,
      totalUniqueVisitors,
      totalSessions,
      avgBounceRate,
      dataQuality,
      platformCount: summaries.length,
    };
  }

  /**
   * 生成基线对比
   * @param dataByPlatform 按平台分组的数据
   * @param baselines 基线数据
   * @returns 基线对比结果
   */
  private generateBaselineComparisons(
    dataByPlatform: Map<PlatformType, TrafficData[]>,
    baselines: Map<PlatformType, BaselineData>
  ): MonthlyReport['baselineComparisons'] {
    const comparisons: NonNullable<MonthlyReport['baselineComparisons']> = [];

    dataByPlatform.forEach((platformData, platform) => {
      const baseline = baselines.get(platform);
      if (!baseline || platformData.length === 0) return;

      // 使用最新的数据点进行比较
      const latestData = platformData[platformData.length - 1];
      const comparison = this.anomalyDetector.compareWithBaseline(latestData, baseline);

      comparisons.push({
        platform,
        comparison,
      });
    });

    return comparisons;
  }

  /**
   * 检测所有异常
   * @param data 流量数据
   * @param baselines 基线数据
   * @returns 异常数组
   */
  private detectAllAnomalies(
    data: TrafficData[],
    baselines: Map<PlatformType, BaselineData>
  ): MonthlyReport['anomalies'] {
    const anomalies: NonNullable<MonthlyReport['anomalies']> = [];

    data.forEach(item => {
      const baseline = baselines.get(item.platform);
      if (!baseline) return;

      const detection = this.anomalyDetector.detectAnomaly(item, baseline);
      if (detection.isAnomaly) {
        anomalies.push({
          platform: item.platform,
          timestamp: item.timestamp,
          detection,
          data: item,
        });
      }
    });

    return anomalies;
  }

  /**
   * 分析趋势
   * @param dataByPlatform 按平台分组的数据
   * @returns 趋势分析结果
   */
  private analyzeTrends(
    dataByPlatform: Map<PlatformType, TrafficData[]>
  ): MonthlyReport['trends'] {
    const trends: MonthlyReport['trends'] = [];

    dataByPlatform.forEach((platformData, platform) => {
      if (platformData.length < 2) {
        trends.push({
          platform,
          direction: 'stable',
          changeRate: 0,
          description: 'Insufficient data for trend analysis',
        });
        return;
      }

      // 比较前半段和后半段的平均值
      const midPoint = Math.floor(platformData.length / 2);
      const firstHalf = platformData.slice(0, midPoint);
      const secondHalf = platformData.slice(midPoint);

      const firstHalfAvg =
        firstHalf.reduce((sum, d) => sum + d.pageViews, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, d) => sum + d.pageViews, 0) / secondHalf.length;

      const changeRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      let direction: 'up' | 'down' | 'stable';
      let description: string;

      if (changeRate > 10) {
        direction = 'up';
        description = `Upward trend detected with ${changeRate.toFixed(1)}% increase`;
      } else if (changeRate < -10) {
        direction = 'down';
        description = `Downward trend detected with ${Math.abs(changeRate).toFixed(1)}% decrease`;
      } else {
        direction = 'stable';
        description = `Stable traffic pattern with ${Math.abs(changeRate).toFixed(1)}% variation`;
      }

      trends.push({
        platform,
        direction,
        changeRate,
        description,
      });
    });

    return trends;
  }

  /**
   * 生成建议
   * @param anomalies 异常数据
   * @param trends 趋势数据
   * @param overview 概览数据
   * @returns 建议数组
   */
  private generateRecommendations(
    anomalies?: MonthlyReport['anomalies'],
    trends?: MonthlyReport['trends'],
    overview?: MonthlyReport['overview']
  ): string[] {
    const recommendations: string[] = [];

    // 基于异常的建议
    if (anomalies && anomalies.length > 0) {
      const anomalyPlatforms = new Set(anomalies.map(a => a.platform));
      recommendations.push(
        `Investigate anomalies detected on ${Array.from(anomalyPlatforms).join(', ')} platforms`
      );

      const spikes = anomalies.filter(a => a.detection.type === 'spike');
      if (spikes.length > 0) {
        recommendations.push(
          'Traffic spikes detected - verify if these are from legitimate campaigns or potential issues'
        );
      }

      const drops = anomalies.filter(a => a.detection.type === 'drop');
      if (drops.length > 0) {
        recommendations.push(
          'Traffic drops detected - check for technical issues or content problems'
        );
      }
    }

    // 基于趋势的建议
    if (trends) {
      const downwardTrends = trends.filter(t => t.direction === 'down');
      if (downwardTrends.length > 0) {
        recommendations.push(
          `Address declining traffic on ${downwardTrends.map(t => t.platform).join(', ')}`
        );
      }

      const upwardTrends = trends.filter(t => t.direction === 'up');
      if (upwardTrends.length > 0) {
        recommendations.push(
          `Capitalize on growing traffic on ${upwardTrends.map(t => t.platform).join(', ')}`
        );
      }
    }

    // 基于数据质量的建议
    if (overview && overview.dataQuality < 80) {
      recommendations.push(
        'Improve data collection quality - current quality score is below 80%'
      );
    }

    // 如果没有特别的建议
    if (recommendations.length === 0) {
      recommendations.push('Traffic patterns are within normal ranges - continue monitoring');
    }

    return recommendations;
  }

  /**
   * 格式化报告
   * @param report 报告数据
   * @returns 格式化后的报告
   */
  private async formatReport(report: MonthlyReport): Promise<MonthlyReport> {
    switch (this.config.format) {
      case ReportFormat.JSON:
        // JSON 格式直接返回
        return report;

      case ReportFormat.HTML:
        // HTML 格式暂时返回 JSON（实际项目中应生成 HTML）
        console.log('HTML format not yet implemented, returning JSON');
        return report;

      case ReportFormat.PDF:
        // PDF 格式暂时返回 JSON（实际项目中应生成 PDF）
        console.log('PDF format not yet implemented, returning JSON');
        return report;

      default:
        return report;
    }
  }

  /**
   * 导出报告
   * @param report 报告数据
   * @param filePath 文件路径
   */
  async exportReport(report: MonthlyReport, filePath: string): Promise<void> {
    const fs = await import('fs').then(m => m.promises);
    const content = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Report exported to ${filePath}`);
  }
}