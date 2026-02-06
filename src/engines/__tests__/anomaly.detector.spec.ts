/**
 * 异常检测器测试
 */

import { AnomalyDetector } from '../anomaly.detector';
import { TrafficData, PlatformType } from '../../models/traffic.model';
import { BaselineData, BaselineMode } from '../../models/baseline.model';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  const createBaselineData = (): BaselineData => ({
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
  });

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('detectAnomaly', () => {
    it('should detect spike anomaly', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1500, // 5 standard deviations above mean
        uniqueVisitors: 450, // 5 standard deviations above mean
        sessions: 600, // 5 standard deviations above mean
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('spike');
      expect(result.anomalousMetrics).toContain('pageViews');
      expect(result.anomalousMetrics).toContain('uniqueVisitors');
      expect(result.anomalousMetrics).toContain('sessions');
      expect(result.deviation).toBeGreaterThan(4);
      expect(result.description).toContain('spike');
    });

    it('should detect drop anomaly', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 500, // 5 standard deviations below mean
        uniqueVisitors: 150, // 5 standard deviations below mean
        sessions: 200, // 5 standard deviations below mean
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('drop');
      expect(result.anomalousMetrics).toContain('pageViews');
      expect(result.anomalousMetrics).toContain('uniqueVisitors');
      expect(result.anomalousMetrics).toContain('sessions');
      expect(result.description).toContain('drop');
    });

    it('should detect pattern anomaly for multiple metrics', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1300, // 3 standard deviations above
        uniqueVisitors: 390, // 3 standard deviations above
        sessions: 400, // Normal
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('pattern');
      expect(result.anomalousMetrics!.length).toBe(2);
      expect(result.description).toContain('Multiple metrics');
    });

    it('should not detect anomaly for normal data', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1050, // Within 1 standard deviation
        uniqueVisitors: 315, // Within 1 standard deviation
        sessions: 420, // Within 1 standard deviation
        avgSessionDuration: 185,
        bounceRate: 43,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(false);
      expect(result.type).toBeUndefined();
      expect(result.anomalousMetrics).toEqual([]);
      expect(result.deviation).toBe(0);
    });

    it('should calculate correct deviation', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1200, // Exactly 2 standard deviations above mean
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(false); // 2 std dev is the threshold
      expect(result.deviation).toBe(0); // Not anomalous, so deviation is 0
    });

    it('should handle edge case with zero standard deviation', () => {
      const baseline = createBaselineData();
      baseline.standardDeviation.pageViews = 0;

      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1001, // Any deviation from mean
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const result = detector.detectAnomaly(data, baseline);

      expect(result.isAnomaly).toBe(false); // Can't calculate deviation with 0 std dev
    });
  });

  describe('compareWithBaseline', () => {
    it('should calculate correct comparison metrics', () => {
      const baseline = createBaselineData();
      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1100, // 10% increase
        uniqueVisitors: 330, // 10% increase
        sessions: 440, // 10% increase
        avgSessionDuration: 198, // 10% increase
        bounceRate: 49.5, // 10% increase
      };

      const comparison = detector.compareWithBaseline(data, baseline);

      expect(comparison.current.pageViews).toBe(1100);
      expect(comparison.baseline.pageViews).toBe(1000);
      expect(comparison.changeRate.pageViews).toBeCloseTo(10, 1);
      expect(comparison.deviation.pageViews).toBeCloseTo(1, 1); // 1 std dev
      expect(comparison.anomalyDetection.isAnomaly).toBe(false);
    });

    it('should handle zero baseline values', () => {
      const baseline = createBaselineData();
      baseline.values.pageViews = 0;

      const data: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1000,
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const comparison = detector.compareWithBaseline(data, baseline);

      expect(comparison.changeRate.pageViews).toBe(100); // 100% when baseline is 0
    });
  });

  describe('detectBatchAnomalies', () => {
    it('should detect anomalies in batch', () => {
      const baseline = createBaselineData();
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-08'),
          pageViews: 1050, // Normal
          uniqueVisitors: 315,
          sessions: 420,
          avgSessionDuration: 185,
          bounceRate: 43,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-09'),
          pageViews: 1500, // Anomaly
          uniqueVisitors: 450,
          sessions: 600,
          avgSessionDuration: 200,
          bounceRate: 35,
        },
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-10'),
          pageViews: 500, // Anomaly
          uniqueVisitors: 150,
          sessions: 200,
          avgSessionDuration: 160,
          bounceRate: 55,
        },
      ];

      const anomalies = detector.detectBatchAnomalies(dataArray, baseline);

      expect(anomalies.length).toBe(2);
      expect(anomalies[0].data.pageViews).toBe(1500);
      expect(anomalies[0].result.type).toBe('spike');
      expect(anomalies[1].data.pageViews).toBe(500);
      expect(anomalies[1].result.type).toBe('drop');
    });

    it('should return empty array when no anomalies', () => {
      const baseline = createBaselineData();
      const dataArray: TrafficData[] = [
        {
          platform: PlatformType.MOCK,
          timestamp: new Date('2024-01-08'),
          pageViews: 1000,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        },
      ];

      const anomalies = detector.detectBatchAnomalies(dataArray, baseline);

      expect(anomalies).toEqual([]);
    });
  });

  describe('detectTrendAnomalies', () => {
    it('should detect sudden increase trend', () => {
      const dataArray: TrafficData[] = [];

      // Normal traffic for first 7 days
      for (let i = 1; i <= 7; i++) {
        dataArray.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 1000 + Math.random() * 100,
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      // Sudden increase
      for (let i = 8; i <= 14; i++) {
        dataArray.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 2000 + Math.random() * 100, // Doubled traffic
          uniqueVisitors: 600,
          sessions: 800,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      const anomalies = detector.detectTrendAnomalies(dataArray, 3);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].trend).toBe('sudden_increase');
    });

    it('should detect sudden decrease trend', () => {
      const dataArray: TrafficData[] = [];

      // Normal traffic for first 7 days
      for (let i = 1; i <= 7; i++) {
        dataArray.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 2000 + Math.random() * 100,
          uniqueVisitors: 600,
          sessions: 800,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      // Sudden decrease
      for (let i = 8; i <= 14; i++) {
        dataArray.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 800 + Math.random() * 100, // 60% drop
          uniqueVisitors: 240,
          sessions: 320,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      const anomalies = detector.detectTrendAnomalies(dataArray, 3);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].trend).toBe('sudden_decrease');
    });

    it('should not detect anomaly for gradual changes', () => {
      const dataArray: TrafficData[] = [];

      // Gradual increase
      for (let i = 1; i <= 14; i++) {
        dataArray.push({
          platform: PlatformType.MOCK,
          timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}`),
          pageViews: 1000 + i * 20, // Gradual 2% daily increase
          uniqueVisitors: 300,
          sessions: 400,
          avgSessionDuration: 180,
          bounceRate: 45,
        });
      }

      const anomalies = detector.detectTrendAnomalies(dataArray, 3);

      expect(anomalies.length).toBe(0); // No sudden changes
    });

    it('should handle insufficient data', () => {
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
      ];

      const anomalies = detector.detectTrendAnomalies(dataArray, 3);

      expect(anomalies).toEqual([]);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate appropriate confidence levels', () => {
      const baseline = createBaselineData();

      // Low deviation (< 2 std dev)
      const lowDeviationData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1150, // 1.5 std dev
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const lowResult = detector.detectAnomaly(lowDeviationData, baseline);
      expect(lowResult.confidence).toBeLessThanOrEqual(50);

      // Medium deviation (2-3 std dev)
      const mediumDeviationData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1250, // 2.5 std dev
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const mediumResult = detector.detectAnomaly(mediumDeviationData, baseline);
      expect(mediumResult.confidence).toBeGreaterThan(50);
      expect(mediumResult.confidence).toBeLessThanOrEqual(75);

      // High deviation (> 4 std dev)
      const highDeviationData: TrafficData = {
        platform: PlatformType.MOCK,
        timestamp: new Date('2024-01-08'),
        pageViews: 1500, // 5 std dev
        uniqueVisitors: 300,
        sessions: 400,
        avgSessionDuration: 180,
        bounceRate: 45,
      };

      const highResult = detector.detectAnomaly(highDeviationData, baseline);
      expect(highResult.confidence).toBeGreaterThanOrEqual(90);
    });
  });
});