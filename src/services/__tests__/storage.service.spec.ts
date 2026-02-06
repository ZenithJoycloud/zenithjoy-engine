/**
 * 存储服务测试
 */

import { StorageService, QueryOptions } from '../storage.service';
import { TrafficData, PlatformType } from '../../models/traffic.model';
import { BaselineData, BaselineMode } from '../../models/baseline.model';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  afterEach(async () => {
    await service.clearAll();
  });

  describe('saveTrafficData', () => {
    it('should save traffic data with generated ID', async () => {
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-01'),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const saved = await service.saveTrafficData(data);

      expect(saved.id).toBeDefined();
      expect(saved.platform).toBe(PlatformType.MOCK);
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should preserve existing ID if provided', async () => {
      const data: TrafficData = {
        id: 'custom_id_123',
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const saved = await service.saveTrafficData(data);

      expect(saved.id).toBe('custom_id_123');
    });
  });

  describe('saveTrafficDataBatch', () => {
    it('should save multiple data points', async () => {
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-01'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.YOUTUBE,
          timestamp: new Date('2024-01-02'),
          pageViews: 2000,
          uniqueVisitors: 600,
          sessions: 800,
          avgSessionDuration: 200,
          bounceRate: 40,
        },
      ];

      const saved = await service.saveTrafficDataBatch(dataArray);

      expect(saved.length).toBe(2);
      expect(saved[0].id).toBeDefined();
      expect(saved[1].id).toBeDefined();
      expect(saved[0].id).not.toBe(saved[1].id);
    });
  });

  describe('queryTrafficData', () => {
    beforeEach(async () => {
      // Seed test data
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-01'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
          isAnomaly: false,
        },
        {
          platform: PlatformType.YOUTUBE,
          timestamp: new Date('2024-01-02'),
          pageViews: 2000,
          uniqueVisitors: 600,
          sessions: 800,
          avgSessionDuration: 200,
          bounceRate: 40,
          isAnomaly: true,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-03'),
          pageViews: 1500,
          uniqueVisitors: 450,
          sessions: 600,
          avgSessionDuration: 190,
          bounceRate: 42,
          isAnomaly: false,
        },
      ];

      await service.saveTrafficDataBatch(dataArray);
    });

    it('should query all data when no options provided', async () => {
      const results = await service.queryTrafficData();

      expect(results.length).toBe(3);
    });

    it('should filter by platform', async () => {
      const options: QueryOptions = {
        platform: PlatformType.MOCK,
      };

      const results = await service.queryTrafficData(options);

      expect(results.length).toBe(2);
      expect(results.every(r => r.platform === PlatformType.MOCK)).toBe(true);
    });

    it('should filter by date range', async () => {
      const options: QueryOptions = {
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-02'),
      };

      const results = await service.queryTrafficData(options);

      expect(results.length).toBe(1);
      expect(results[0].pageViews).toBe(2000);
    });

    it('should exclude anomalies when specified', async () => {
      const options: QueryOptions = {
        includeAnomalies: false,
      };

      const results = await service.queryTrafficData(options);

      expect(results.length).toBe(2);
      expect(results.every(r => !r.isAnomaly)).toBe(true);
    });

    it('should sort by pageViews ascending', async () => {
      const options: QueryOptions = {
        sortBy: 'pageViews',
        sortOrder: 'asc',
      };

      const results = await service.queryTrafficData(options);

      expect(results[0].pageViews).toBe(1000);
      expect(results[1].pageViews).toBe(1500);
      expect(results[2].pageViews).toBe(2000);
    });

    it('should apply pagination', async () => {
      const options: QueryOptions = {
        offset: 1,
        limit: 1,
      };

      const results = await service.queryTrafficData(options);

      expect(results.length).toBe(1);
    });
  });

  describe('getTrafficSummary', () => {
    beforeEach(async () => {
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-01'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-02'),
          pageViews: 1200,
          uniqueVisitors: 350,
          sessions: 450,
          avgSessionDuration: 200,
          bounceRate: 40,
        },
      ];

      await service.saveTrafficDataBatch(dataArray);
    });

    it('should calculate summary statistics', async () => {
      const summary = await service.getTrafficSummary(
        PlatformType.MOCK,
        new Date('2024-01-01'),
        new Date('2024-01-02')
      );

      expect(summary.platform).toBe(PlatformType.MOCK);
      expect(summary.totalPageViews).toBe(2200);
      expect(summary.totalUniqueVisitors).toBe(650);
      expect(summary.totalSessions).toBe(850);
      expect(summary.avgSessionDuration).toBe(190);
      expect(summary.avgBounceRate).toBe(42.5);
      expect(summary.dataPoints).toBe(2);
    });

    it('should return zero summary for no data', async () => {
      const summary = await service.getTrafficSummary(
        PlatformType.TWITTER,
        new Date('2024-01-01'),
        new Date('2024-01-02')
      );

      expect(summary.totalPageViews).toBe(0);
      expect(summary.totalUniqueVisitors).toBe(0);
      expect(summary.totalSessions).toBe(0);
      expect(summary.dataPoints).toBe(0);
    });
  });

  describe('saveBaselineData', () => {
    it('should save baseline data', async () => {
      const baseline: BaselineData = {
        platform: PlatformType.MOCK,
        mode: BaselineMode.WEEKLY,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-07'),
        },
        values: {
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        standardDeviation: {
          pageViews: 100,
          uniqueVisitors: 30,
          sessions: 40,
          avgSessionDuration: 20,
          bounceRate: 5,
        },
        anomalyThreshold: {
          upper: {
            pageViews: 1200,
            uniqueVisitors: 360,
            sessions: 480,
          },
          lower: {
            pageViews: 800,
            uniqueVisitors: 240,
            sessions: 320,
          },
        },
        sampleSize: 7,
        confidence: 95,
      };

      const saved = await service.saveBaselineData(baseline);

      expect(saved.id).toBeDefined();
      expect(saved.platform).toBe(PlatformType.MOCK);
      expect(saved.mode).toBe(BaselineMode.WEEKLY);
    });
  });

  describe('queryBaselineData', () => {
    it('should return the latest baseline for platform and mode', async () => {
      const oldBaseline: BaselineData = {
        platform: PlatformType.MOCK,
        mode: BaselineMode.WEEKLY,
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-07'),
        },
        values: {
          pageViews: 900,
          uniqueVisitors: 280,
          sessions: 380,
          avgSessionDuration: 170,
          bounceRate: 48,
        },
        standardDeviation: {
          pageViews: 90,
          uniqueVisitors: 28,
          sessions: 38,
          avgSessionDuration: 17,
          bounceRate: 4,
        },
        anomalyThreshold: {
          upper: { pageViews: 1080, uniqueVisitors: 336, sessions: 456 },
          lower: { pageViews: 720, uniqueVisitors: 224, sessions: 304 },
        },
        sampleSize: 7,
        confidence: 95,
      };

      await service.saveBaselineData(oldBaseline);

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Save a newer baseline
      const newBaseline: BaselineData = {
        ...oldBaseline,
        values: {
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
      };

      await service.saveBaselineData(newBaseline);

      const result = await service.queryBaselineData(PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(result).toBeDefined();
      expect(result!.values.pageViews).toBe(1000); // Should return the newer one
    });

    it('should return null when no baseline exists', async () => {
      const result = await service.queryBaselineData(PlatformType.TWITTER, BaselineMode.DAILY);

      expect(result).toBeNull();
    });
  });

  describe('deleteOldData', () => {
    it('should delete data older than specified date', async () => {
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2023-12-01'),
          pageViews: 500,
          uniqueVisitors: 150,
          sessions: 200,
          avgSessionDuration: 120,
          bounceRate: 50,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-15'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
      ];

      await service.saveTrafficDataBatch(dataArray);

      const deletedCount = await service.deleteOldData(new Date('2024-01-01'));

      expect(deletedCount).toBe(1);

      const remaining = await service.queryTrafficData();
      expect(remaining.length).toBe(1);
      expect(remaining[0].pageViews).toBe(1000);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-01'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.YOUTUBE,
          timestamp: new Date('2024-01-02'),
          pageViews: 2000,
          uniqueVisitors: 600,
          sessions: 800,
          avgSessionDuration: 200,
          bounceRate: 40,
        },
      ];

      await service.saveTrafficDataBatch(dataArray);

      const stats = service.getStorageStats();

      expect(stats.trafficDataCount).toBe(2);
      expect(stats.baselineDataCount).toBe(0);
      expect(stats.platformCounts[PlatformType.MOCK]).toBe(1);
      expect(stats.platformCounts[PlatformType.YOUTUBE]).toBe(1);
      expect(stats.oldestData).toEqual(new Date('2024-01-01'));
      expect(stats.newestData).toEqual(new Date('2024-01-02'));
    });
  });

  describe('clearAll', () => {
    it('should clear all data', async () => {
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date(),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      await service.saveTrafficData(data);

      const statsBefore = service.getStorageStats();
      expect(statsBefore.trafficDataCount).toBe(1);

      await service.clearAll();

      const statsAfter = service.getStorageStats();
      expect(statsAfter.trafficDataCount).toBe(0);
    });
  });
});