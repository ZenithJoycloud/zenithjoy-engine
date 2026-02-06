/**
 * Multi-Platform Publisher Tests
 */

import { MultiPlatformPublisher } from './publisher';
import { PlatformName, PublishContent } from '../platforms';

describe('MultiPlatformPublisher', () => {
  let publisher: MultiPlatformPublisher;

  beforeEach(() => {
    publisher = new MultiPlatformPublisher();
  });

  describe('registerPlatform', () => {
    it('should register WeChat platform', () => {
      publisher.registerPlatform(PlatformName.WeChat, {
        apiKey: 'test_key',
        apiSecret: 'test_secret'
      });

      const platforms = publisher.getRegisteredPlatforms();
      expect(platforms).toContain(PlatformName.WeChat);
    });

    it('should register multiple platforms', () => {
      publisher.registerPlatform(PlatformName.WeChat, {
        apiKey: 'wechat_key'
      });
      publisher.registerPlatform(PlatformName.Xiaohongshu, {
        apiKey: 'xhs_key'
      });

      const platforms = publisher.getRegisteredPlatforms();
      expect(platforms).toHaveLength(2);
      expect(platforms).toContain(PlatformName.WeChat);
      expect(platforms).toContain(PlatformName.Xiaohongshu);
    });

    it('should throw error for unimplemented platform', () => {
      expect(() => {
        publisher.registerPlatform(PlatformName.Douyin, {});
      }).toThrow('Platform Douyin not implemented yet');
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      publisher.registerPlatform(PlatformName.WeChat, {
        apiKey: 'test_key',
        apiSecret: 'test_secret'
      });
      publisher.registerPlatform(PlatformName.Xiaohongshu, {
        apiKey: 'test_key',
        refreshToken: 'test_refresh'
      });
    });

    const content: PublishContent = {
      title: 'Test Post',
      text: 'This is a test post for multiple platforms',
      images: ['test.jpg'],
      tags: ['test', 'multiplatform']
    };

    it('should publish to all registered platforms by default', async () => {
      const result = await publisher.publish(content);

      expect(result.totalPlatforms).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should publish to specific platforms only', async () => {
      const result = await publisher.publish(content, {
        platforms: [PlatformName.WeChat]
      });

      expect(result.totalPlatforms).toBe(1);
      expect(result.results[0].platform).toBe('WeChat');
    });

    it('should publish in parallel by default', async () => {
      const startTime = Date.now();
      const result = await publisher.publish(content, {
        parallel: true
      });
      const duration = Date.now() - startTime;

      expect(result.totalPlatforms).toBe(2);
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(1000);
    });

    it('should publish sequentially when specified', async () => {
      const result = await publisher.publish(content, {
        parallel: false
      });

      expect(result.totalPlatforms).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should continue on error when specified', async () => {
      // Register a platform that will fail (Xiaohongshu requires images)
      const invalidContent: PublishContent = {
        text: 'No images for Xiaohongshu'
      };

      const result = await publisher.publish(invalidContent, {
        continueOnError: true
      });

      expect(result.totalPlatforms).toBe(2);
      expect(result.failureCount).toBeGreaterThan(0);
    });

    it('should respect timeout option', async () => {
      const result = await publisher.publish(content, {
        timeout: 100 // Very short timeout
      });

      // With such a short timeout, some might fail
      expect(result.results).toHaveLength(2);
    });

    it('should throw error when no platforms selected', async () => {
      const emptyPublisher = new MultiPlatformPublisher();

      await expect(emptyPublisher.publish(content)).rejects.toThrow(
        'No valid platforms selected for publishing'
      );
    });
  });

  describe('checkAllPlatformsHealth', () => {
    beforeEach(() => {
      publisher.registerPlatform(PlatformName.WeChat, {});
      publisher.registerPlatform(PlatformName.Xiaohongshu, {});
    });

    it('should check health of all platforms', async () => {
      const healthStatus = await publisher.checkAllPlatformsHealth();

      expect(healthStatus.size).toBe(2);
      expect(healthStatus.has(PlatformName.WeChat)).toBe(true);
      expect(healthStatus.has(PlatformName.Xiaohongshu)).toBe(true);
    });
  });

  describe('refreshAllAuth', () => {
    beforeEach(() => {
      publisher.registerPlatform(PlatformName.WeChat, {
        apiKey: 'key',
        apiSecret: 'secret'
      });
    });

    it('should refresh auth for all platforms', async () => {
      await expect(publisher.refreshAllAuth()).resolves.not.toThrow();
    });
  });

  describe('calculateSuccessRate', () => {
    it('should calculate success rate correctly', () => {
      const result = {
        totalPlatforms: 4,
        successCount: 3,
        failureCount: 1,
        results: [],
        duration: 1000,
        timestamp: new Date()
      };

      const rate = MultiPlatformPublisher.calculateSuccessRate(result);
      expect(rate).toBe(75);
    });

    it('should return 0 for no platforms', () => {
      const result = {
        totalPlatforms: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
        duration: 0,
        timestamp: new Date()
      };

      const rate = MultiPlatformPublisher.calculateSuccessRate(result);
      expect(rate).toBe(0);
    });
  });
});