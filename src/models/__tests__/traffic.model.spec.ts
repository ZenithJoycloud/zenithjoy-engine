/**
 * 流量数据模型测试
 */

import { StandardizedTrafficData, PlatformType, TrafficData } from '../traffic.model';

describe('StandardizedTrafficData', () => {
  describe('constructor', () => {
    it('should create a standardized traffic data instance', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-01'),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.platform).toBe(PlatformType.MOCK);
      expect(standardized.timestamp).toEqual(new Date('2024-01-01'));
      expect(standardized.pageViews).toBe(1000);
      expect(standardized.uniqueVisitors).toBe(300);
      expect(standardized.sessions).toBe(400);
      expect(standardized.avgSessionDuration).toBe(180);
      expect(standardized.bounceRate).toBe(45);
    });

    it('should handle negative values by converting to 0', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: -100,
        uniqueVisitors: -50,
        sessions: -20,
        avgSessionDuration: -10,
        bounceRate: -5,
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.pageViews).toBe(0);
      expect(standardized.uniqueVisitors).toBe(0);
      expect(standardized.sessions).toBe(0);
      expect(standardized.avgSessionDuration).toBe(0);
      expect(standardized.bounceRate).toBe(0);
    });

    it('should cap bounce rate at 100', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 150,
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.bounceRate).toBe(100);
    });
  });

  describe('calculateQualityScore', () => {
    it('should give high quality score for complete data', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.qualityScore).toBeGreaterThan(80);
    });

    it('should reduce quality score for missing metrics', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 0,
        uniqueVisitors: 0,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.qualityScore).toBeLessThan(80);
    });

    it('should reduce quality score for illogical data', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 100,
        uniqueVisitors: 200, // More visitors than page views (illogical)
        sessions: 150,
        avgSessionDuration: 180,
        bounceRate: 100, // 100% bounce rate is suspicious
      };

      const standardized = new StandardizedTrafficData(rawData);

      expect(standardized.qualityScore).toBeLessThan(70);
    });
  });

  describe('toJSON', () => {
    it('should convert to JSON format', () => {
      const rawData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-01'),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const standardized = new StandardizedTrafficData(rawData);
      const json = standardized.toJSON();

      expect(json).toMatchObject({
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-01'),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      });
      expect(json.qualityScore).toBeDefined();
      expect(json.createdAt).toBeDefined();
      expect(json.updatedAt).toBeDefined();
    });
  });
});