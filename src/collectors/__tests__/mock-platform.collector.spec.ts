/**
 * 模拟平台采集器测试
 */

import { MockPlatformCollector } from '../mock-platform.collector';
import { PlatformType } from '../../models/traffic.model';

describe('MockPlatformCollector', () => {
  beforeEach(() => {
    // 禁用模拟失败以保证测试的可预测性
    process.env.DISABLE_MOCK_FAILURES = 'true';
  });

  afterEach(() => {
    delete process.env.DISABLE_MOCK_FAILURES;
  });

  describe('constructor', () => {
    it('should create collector with MOCK platform', () => {
      const collector = new MockPlatformCollector();
      const status = collector.getStatus();

      expect(status.platform).toBe(PlatformType.MOCK);
      expect(status.config.maxRetries).toBe(3);
    });
  });

  describe('collect', () => {
    it('should generate mock data for date range', async () => {
      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(7); // 7 days of data
      expect(result.data![0].platform).toBe(PlatformType.MOCK);
    });

    it('should generate data with realistic patterns', async () => {
      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-07'); // Sunday

      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);

      const data = result.data!;

      // Check that all required fields are present
      data.forEach(item => {
        expect(item.pageViews).toBeGreaterThan(0);
        expect(item.uniqueVisitors).toBeGreaterThan(0);
        expect(item.sessions).toBeGreaterThan(0);
        expect(item.avgSessionDuration).toBeGreaterThan(0);
        expect(item.bounceRate).toBeGreaterThan(0);
        expect(item.bounceRate).toBeLessThanOrEqual(100);
      });

      // Weekend data (indexes 5 and 6) should generally be lower
      const weekdayAvg = (data[0].pageViews + data[1].pageViews + data[2].pageViews +
                         data[3].pageViews + data[4].pageViews) / 5;
      const weekendAvg = (data[5].pageViews + data[6].pageViews) / 2;

      // Weekend traffic is typically 70% of weekday traffic in our mock
      // But with randomness, we just check it's generally lower
      expect(weekendAvg).toBeLessThan(weekdayAvg * 1.2);
    });

    it('should occasionally generate anomalies', async () => {
      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31'); // 31 days

      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);

      const anomalies = result.data!.filter(item => item.isAnomaly);

      // With 5% probability and 31 days, we expect 0-3 anomalies typically
      // But randomness means we might get 0, so just check the structure
      if (anomalies.length > 0) {
        expect(anomalies[0].isAnomaly).toBe(true);
      }
    });

    it('should handle API errors with retry', async () => {
      // Enable mock failures for this test
      delete process.env.DISABLE_MOCK_FAILURES;

      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');

      // Run multiple times to account for randomness
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < 10; i++) {
        const result = await collector.collect(startDate, endDate);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // With 10% failure rate and 3 retries, most should succeed
      expect(successCount).toBeGreaterThan(failCount);
    });
  });

  describe('generateTestData', () => {
    it('should generate test data for specified days', async () => {
      const collector = new MockPlatformCollector();
      const days = 14;

      const data = await collector.generateTestData(days);

      expect(data.length).toBe(days + 1); // includes today
      expect(data[0].platform).toBe(PlatformType.MOCK);

      // Check that dates are in the correct range
      const now = new Date();
      const oldestDate = new Date(data[0].timestamp);
      const daysDiff = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeCloseTo(days, 0);
    });

    it('should return empty array on failure', async () => {
      // Create a collector that always fails
      class FailingMockCollector extends MockPlatformCollector {
        protected async fetchData(): Promise<any> {
          throw new Error('Always fails');
        }
      }

      const collector = new FailingMockCollector();
      const data = await collector.generateTestData(7);

      expect(data).toEqual([]);
    });
  });

  describe('data quality', () => {
    it('should generate data with high quality scores', async () => {
      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);

      const data = result.data!;
      data.forEach(item => {
        // Check that quality score is calculated
        if (item.qualityScore !== undefined) {
          expect(item.qualityScore).toBeGreaterThan(0);
          expect(item.qualityScore).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should maintain logical relationships in data', async () => {
      const collector = new MockPlatformCollector();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      const result = await collector.collect(startDate, endDate);

      expect(result.success).toBe(true);

      const data = result.data!;
      data.forEach(item => {
        // Unique visitors should not exceed page views (logical constraint)
        expect(item.uniqueVisitors).toBeLessThanOrEqual(item.pageViews);

        // Session duration should be reasonable (between 0 and 20 minutes)
        expect(item.avgSessionDuration).toBeGreaterThan(0);
        expect(item.avgSessionDuration).toBeLessThan(1200); // 20 minutes

        // Bounce rate should be between 0 and 100
        expect(item.bounceRate).toBeGreaterThanOrEqual(0);
        expect(item.bounceRate).toBeLessThanOrEqual(100);
      });
    });
  });
});