/**
 * 模拟平台数据采集器（用于测试）
 */

import { BaseCollector } from './base.collector';
import { StandardizedTrafficData, PlatformType } from '../models/traffic.model';

/**
 * 模拟平台采集器
 */
export class MockPlatformCollector extends BaseCollector {
  /**
   * 构造函数
   */
  constructor() {
    super({
      platform: PlatformType.MOCK,
      maxRetries: 3,
      retryDelay: 100,
    });
  }

  /**
   * 获取模拟数据
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 模拟的原始数据
   */
  protected async fetchData(startDate: Date, endDate: Date): Promise<any> {
    // 模拟网络延迟
    await this.delay(Math.random() * 500);

    // 模拟偶尔的失败（10% 概率）
    if (Math.random() < 0.1 && !process.env.DISABLE_MOCK_FAILURES) {
      throw new Error('Mock API error: Service temporarily unavailable');
    }

    // 生成模拟数据
    const timeSeries = this.generateTimeSeries(startDate, endDate, 24);
    const mockData = timeSeries.map((timestamp, index) => {
      const basePageViews = 10000;
      const baseUniqueVisitors = 3000;
      const baseSessions = 4000;

      // 添加一些随机波动
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2

      // 模拟周期性模式（周末流量下降）
      const dayOfWeek = timestamp.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;

      // 模拟异常数据（5% 概率）
      const isAnomaly = Math.random() < 0.05;
      const anomalyFactor = isAnomaly ? (Math.random() < 0.5 ? 0.3 : 2.5) : 1.0;

      return {
        date: timestamp.toISOString(),
        metrics: {
          views: Math.round(basePageViews * randomFactor * weekendFactor * anomalyFactor),
          visitors: Math.round(baseUniqueVisitors * randomFactor * weekendFactor * anomalyFactor),
          sessions: Math.round(baseSessions * randomFactor * weekendFactor * anomalyFactor),
          avgDuration: Math.round(300 + Math.random() * 300), // 5-10 minutes
          bounceRate: 30 + Math.random() * 40, // 30-70%
        },
        quality: {
          completeness: 0.95 + Math.random() * 0.05,
          accuracy: 0.9 + Math.random() * 0.1,
        },
        _isAnomaly: isAnomaly,
      };
    });

    return mockData;
  }

  /**
   * 标准化模拟数据
   * @param rawData 原始模拟数据
   * @returns 标准化的流量数据
   */
  protected async standardizeData(rawData: any): Promise<StandardizedTrafficData[]> {
    return rawData.map((item: any) => {
      const trafficData = new StandardizedTrafficData({
        platform: PlatformType.MOCK,
        timestamp: new Date(item.date),
        pageViews: item.metrics.views,
        uniqueVisitors: item.metrics.visitors,
        sessions: item.metrics.sessions,
        avgSessionDuration: item.metrics.avgDuration,
        bounceRate: item.metrics.bounceRate,
        rawData: item,
        isAnomaly: item._isAnomaly,
      });

      return trafficData;
    });
  }

  /**
   * 生成批量测试数据
   * @param days 天数
   * @returns 流量数据数组
   */
  async generateTestData(days: number = 30): Promise<StandardizedTrafficData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.collect(startDate, endDate);
    if (result.success && result.data) {
      return result.data.map(item => new StandardizedTrafficData(item));
    }

    return [];
  }
}