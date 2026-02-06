/**
 * 基线计算引擎测试
 */

import { BaselineEngine } from '../baseline.engine';
import { TrafficData, PlatformType } from '../../models/traffic.model';
import { BaselineMode, BaselineConfig } from '../../models/baseline.model';

describe('BaselineEngine', () => {
  let engine: BaselineEngine;

  beforeEach(() => {
    engine = new BaselineEngine();
  });

  describe('calculateBaseline', () => {
    const generateTestData = (count: number, baseValue: number = 1000): TrafficData[] => {
      const data: TrafficData[] = [];
      for (let i = 0; i < count; i++) {
        data.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i + 1}`),
          pageViews: baseValue + Math.random() * 200 - 100, // ±100 variation
          uniqueVisitors: 300 + Math.random() * 60 - 30,
          sessions: 400 + Math.random() * 80 - 40,
          avgSessionDuration: 180 + Math.random() * 40 - 20,
          bounceRate: 45 + Math.random() * 10 - 5,
        });
      }
      return data;
    };

    it('should calculate baseline with sufficient data', () => {
      const data = generateTestData(14);
      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeDefined();
      expect(baseline!.platform).toBe(PlatformType.MOCK);
      expect(baseline!.mode).toBe(BaselineMode.WEEKLY);
      expect(baseline!.sampleSize).toBe(14);
      expect(baseline!.values.pageViews).toBeGreaterThan(900);
      expect(baseline!.values.pageViews).toBeLessThan(1100);
      expect(baseline!.standardDeviation.pageViews).toBeGreaterThan(0);
    });

    it('should return null with insufficient data', () => {
      const data = generateTestData(3); // Less than minimum sample size
      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeNull();
    });

    it('should calculate correct anomaly thresholds', () => {
      const data = generateTestData(14, 1000);
      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeDefined();

      // With 2 standard deviations (default multiplier)
      const expectedUpperThreshold =
        baseline!.values.pageViews + 2 * baseline!.standardDeviation.pageViews;
      const expectedLowerThreshold =
        baseline!.values.pageViews - 2 * baseline!.standardDeviation.pageViews;

      expect(baseline!.anomalyThreshold.upper.pageViews).toBeCloseTo(expectedUpperThreshold, 1);
      expect(baseline!.anomalyThreshold.lower.pageViews).toBeCloseTo(
        Math.max(0, expectedLowerThreshold),
        1
      );
    });

    it('should exclude outliers when configured', () => {
      const data = generateTestData(10, 1000);

      // Add outliers
      data.push({
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-15'),
        pageViews: 5000, // Extreme outlier
        uniqueVisitors: 1500,
        sessions: 2000,
        avgSessionDuration: 300,
        bounceRate: 20,
      });

      const engineWithOutliers = new BaselineEngine({ excludeOutliers: false });
      const engineWithoutOutliers = new BaselineEngine({ excludeOutliers: true });

      const baselineWithOutliers = engineWithOutliers.calculateBaseline(
        data,
        PlatformType.MOCK,
        BaselineMode.WEEKLY
      );
      const baselineWithoutOutliers = engineWithoutOutliers.calculateBaseline(
        data,
        PlatformType.MOCK,
        BaselineMode.WEEKLY
      );

      expect(baselineWithOutliers).toBeDefined();
      expect(baselineWithoutOutliers).toBeDefined();

      // Baseline without outliers should have lower mean due to excluded high value
      expect(baselineWithOutliers!.values.pageViews).toBeGreaterThan(
        baselineWithoutOutliers!.values.pageViews
      );
    });

    it('should use correct confidence level', () => {
      const config: Partial<BaselineConfig> = {
        confidenceLevel: 0.99,
      };
      const engine = new BaselineEngine(config);

      const data = generateTestData(14);
      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeDefined();
      expect(baseline!.confidence).toBe(99);
    });
  });

  describe('aggregateByMode', () => {
    const generateDailyData = (): TrafficData[] => {
      const data: TrafficData[] = [];
      for (let i = 1; i <= 31; i++) {
        data.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 1000 + i * 10,
          uniqueVisitors: 300 + i * 3,
          sessions: 400 + i * 4,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }
      return data;
    };

    it('should aggregate daily data to weekly', () => {
      const data = generateDailyData().slice(0, 14); // Two weeks
      const aggregated = engine.aggregateByMode(data, BaselineMode.WEEKLY);

      // Should have 3 weeks (week starting on Sunday)
      expect(aggregated.length).toBeGreaterThan(0);
      expect(aggregated.length).toBeLessThanOrEqual(3);

      // Check that values are averaged
      aggregated.forEach(item => {
        expect(item.pageViews).toBeGreaterThan(0);
        expect(item.platform).toBe(PlatformType.MOCK);
      });
    });

    it('should aggregate daily data to monthly', () => {
      const data = generateDailyData(); // Full month
      const aggregated = engine.aggregateByMode(data, BaselineMode.MONTHLY);

      // Should have 1 month
      expect(aggregated.length).toBe(1);
      expect(aggregated[0].platform).toBe(PlatformType.MOCK);

      // Average should be around middle of month values
      const expectedAvg = data.reduce((sum, d) => sum + d.pageViews, 0) / data.length;
      expect(aggregated[0].pageViews).toBeCloseTo(expectedAvg, -1);
    });

    it('should handle daily aggregation (no aggregation)', () => {
      const data = generateDailyData().slice(0, 7);
      const aggregated = engine.aggregateByMode(data, BaselineMode.DAILY);

      // Each day should be its own group
      expect(aggregated.length).toBe(7);
    });
  });

  describe('updateConfig and getConfig', () => {
    it('should update configuration', () => {
      const initialConfig = engine.getConfig();
      expect(initialConfig.minSampleSize).toBe(7);

      engine.updateConfig({
        minSampleSize: 14,
        anomalyThresholdMultiplier: 3,
      });

      const updatedConfig = engine.getConfig();
      expect(updatedConfig.minSampleSize).toBe(14);
      expect(updatedConfig.anomalyThresholdMultiplier).toBe(3);
      expect(updatedConfig.confidenceLevel).toBe(0.95); // Unchanged
    });
  });

  describe('statistical calculations', () => {
    it('should calculate accurate statistics for known data', () => {
      // Use fixed data for predictable results
      const data: TrafficData[] = [
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
          pageViews: 1100,
          uniqueVisitors: 330,
          sessions: 440,
          avgSessionDuration: 190,
          bounceRate: 43,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-03'),
          pageViews: 900,
          uniqueVisitors: 270,
          sessions: 360,
          avgSessionDuration: 170,
          bounceRate: 47,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-04'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-05'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-06'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-07'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
      ];

      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeDefined();

      // Mean should be 1000
      expect(baseline!.values.pageViews).toBeCloseTo(1000, 0);

      // Standard deviation calculation
      // Values: 1000, 1100, 900, 1000, 1000, 1000, 1000
      // Mean: 1000
      // Deviations: 0, 100, -100, 0, 0, 0, 0
      // Squared: 0, 10000, 10000, 0, 0, 0, 0
      // Variance: 20000/7 = 2857.14
      // StdDev: sqrt(2857.14) ≈ 53.45
      expect(baseline!.standardDeviation.pageViews).toBeCloseTo(53.45, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const baseline = engine.calculateBaseline([], PlatformType.MOCK, BaselineMode.WEEKLY);
      expect(baseline).toBeNull();
    });

    it('should handle single data point', () => {
      const data: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date(),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
      ];

      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);
      expect(baseline).toBeNull(); // Insufficient data
    });

    it('should handle all identical values', () => {
      const data: TrafficData[] = [];
      for (let i = 0; i < 10; i++) {
        data.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i + 1}`),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      const baseline = engine.calculateBaseline(data, PlatformType.MOCK, BaselineMode.WEEKLY);

      expect(baseline).toBeDefined();
      expect(baseline!.values.pageViews).toBe(1000);
      expect(baseline!.standardDeviation.pageViews).toBe(0);
    });
  });
});