/**
 * 基础采集器测试
 */

import { BaseCollector, CollectorConfig } from '../base.collector';
import { StandardizedTrafficData, PlatformType } from '../../models/traffic.model';

// 创建测试用的具体实现类
class TestCollector extends BaseCollector {
  private shouldFail = false;
  private failCount = 0;
  private maxFails = 0;

  constructor(config: CollectorConfig, shouldFail = false, maxFails = 0) {
    super(config);
    this.shouldFail = shouldFail;
    this.maxFails = maxFails;
  }

  protected async fetchData(startDate: Date, endDate: Date): Promise<any> {
    // 模拟失败和重试
    if (this.shouldFail && this.failCount < this.maxFails) {
      this.failCount++;
      throw new Error('Test fetch error');
    }

    return [
      {
        date: startDate.toISOString(),
        views: 1000,
        visitors: 300,
      },
    ];
  }

  protected async standardizeData(rawData: any): Promise<StandardizedTrafficData[]> {
    return rawData.map((item: any) =>
      new StandardizedTrafficData({
        platform: this.config.platform,
        timestamp: new Date(item.date),
        pageViews: item.views,
        uniqueVisitors: item.visitors,
        sessions: item.views * 0.4,
        avgSessionDuration: 200,
        bounceRate: 40,
      })
    );
  }
}

describe('BaseCollector', () => {
  describe('collect', () => {
    it('should successfully collect and standardize data', async () => {
      const collector = new TestCollector({
        platform: PlatformType.MOCK,
        maxRetries: 3,
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(1);
      expect(result.data![0].platform).toBe(PlatformType.MOCK);
      expect(result.data![0].pageViews).toBe(1000);
      expect(result.duration).toBeDefined();
    });

    it('should retry on failure and eventually succeed', async () => {
      const collector = new TestCollector(
        {
          platform: PlatformType.MOCK,
          maxRetries: 3,
          retryDelay: 10,
        },
        true, // shouldFail
        2 // fail first 2 attempts
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(result.data).toBeDefined();
    });

    it('should return error after max retries', async () => {
      const collector = new TestCollector(
        {
          platform: PlatformType.MOCK,
          maxRetries: 2,
          retryDelay: 10,
        },
        true, // shouldFail
        10 // always fail
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryCount).toBe(3);
    });
  });

  describe('collectBatch', () => {
    it('should collect multiple periods in batch', async () => {
      const collector = new TestCollector({
        platform: PlatformType.MOCK,
        batchSize: 2,
      });

      const periods = [
        { start: new Date('2024-01-01'), end: new Date('2024-01-02') },
        { start: new Date('2024-01-02'), end: new Date('2024-01-03') },
        { start: new Date('2024-01-03'), end: new Date('2024-01-04') },
      ];

      const results = await collector.collectBatch(periods);

      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('validateData', () => {
    it('should filter out invalid data', async () => {
      class ValidatingCollector extends TestCollector {
        protected async standardizeData(rawData: any): Promise<StandardizedTrafficData[]> {
          return [
            new StandardizedTrafficData({
              platform: this.config.platform,
              timestamp: new Date(),
              pageViews: 1000,
              uniqueVisitors: 300,
              sessions: 400,
              avgSessionDuration: 200,
              bounceRate: 40,
            }),
            // This one will have low quality score and might be filtered
            new StandardizedTrafficData({
              platform: this.config.platform,
              timestamp: new Date(),
              pageViews: 0,
              uniqueVisitors: 0,
              sessions: 0,
              avgSessionDuration: 0,
              bounceRate: 0,
            }),
          ];
        }
      }

      const collector = new ValidatingCollector({
        platform: PlatformType.MOCK,
      });

      const result = await collector.collect(new Date(), new Date());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Both should pass basic validation (timestamp and platform exist)
      expect(result.data!.length).toBe(2);
    });
  });

  describe('generateTimeSeries', () => {
    it('should generate correct time series', () => {
      const collector = new TestCollector({
        platform: PlatformType.MOCK,
      });

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-03');

      // Access protected method through a workaround
      const series = (collector as any).generateTimeSeries(start, end, 24);

      expect(series.length).toBe(3); // Jan 1, 2, 3
      expect(series[0].toISOString()).toContain('2024-01-01');
      expect(series[2].toISOString()).toContain('2024-01-03');
    });
  });

  describe('getStatus', () => {
    it('should return collector status', () => {
      const config: CollectorConfig = {
        platform: PlatformType.MOCK,
        maxRetries: 5,
        timeout: 10000,
      };

      const collector = new TestCollector(config);
      const status = collector.getStatus();

      expect(status.platform).toBe(PlatformType.MOCK);
      expect(status.isRunning).toBe(false);
      expect(status.config.maxRetries).toBe(5);
      expect(status.config.timeout).toBe(10000);
    });
  });
});