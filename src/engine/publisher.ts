/**
 * Multi-platform Publishing Engine
 */

import {
  BasePlatformPublisher,
  PublishContent,
  PublishResult,
  PlatformConfig,
  PlatformName,
  WeChatPublisher,
  XiaohongshuPublisher
} from '../platforms';

export interface PublishOptions {
  platforms?: PlatformName[];
  parallel?: boolean;
  continueOnError?: boolean;
  timeout?: number;
}

export interface BatchPublishResult {
  totalPlatforms: number;
  successCount: number;
  failureCount: number;
  results: PublishResult[];
  duration: number;
  timestamp: Date;
}

export class MultiPlatformPublisher {
  private publishers: Map<PlatformName, BasePlatformPublisher>;
  private defaultTimeout: number = 30000;

  constructor() {
    this.publishers = new Map();
  }

  /**
   * Register a platform publisher
   */
  registerPlatform(platform: PlatformName, config: PlatformConfig): void {
    let publisher: BasePlatformPublisher;

    switch (platform) {
      case PlatformName.WeChat:
        publisher = new WeChatPublisher(config);
        break;
      case PlatformName.Xiaohongshu:
        publisher = new XiaohongshuPublisher(config);
        break;
      // TODO: Add other platforms
      default:
        throw new Error(`Platform ${platform} not implemented yet`);
    }

    this.publishers.set(platform, publisher);
  }

  /**
   * Publish content to multiple platforms
   */
  async publish(
    content: PublishContent,
    options: PublishOptions = {}
  ): Promise<BatchPublishResult> {
    const startTime = Date.now();
    const {
      platforms = Array.from(this.publishers.keys()),
      parallel = true,
      continueOnError = true,
      timeout = this.defaultTimeout
    } = options;

    // Filter to only requested platforms
    const selectedPublishers = platforms
      .filter(p => this.publishers.has(p))
      .map(p => this.publishers.get(p)!);

    if (selectedPublishers.length === 0) {
      throw new Error('No valid platforms selected for publishing');
    }

    let results: PublishResult[];

    if (parallel) {
      // Publish to all platforms in parallel
      results = await this.publishParallel(
        selectedPublishers,
        content,
        timeout,
        continueOnError
      );
    } else {
      // Publish sequentially
      results = await this.publishSequential(
        selectedPublishers,
        content,
        timeout,
        continueOnError
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      totalPlatforms: results.length,
      successCount,
      failureCount,
      results,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Publish to platforms in parallel
   */
  private async publishParallel(
    publishers: BasePlatformPublisher[],
    content: PublishContent,
    timeout: number,
    continueOnError: boolean
  ): Promise<PublishResult[]> {
    const promises = publishers.map(publisher =>
      this.publishWithTimeout(publisher, content, timeout)
    );

    if (continueOnError) {
      // Use allSettled to continue even if some fail
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            platform: publishers[index].getPlatformName(),
            success: false,
            error: result.reason?.message || 'Unknown error',
            timestamp: new Date()
          };
        }
      });
    } else {
      // Use Promise.all to fail fast
      return Promise.all(promises);
    }
  }

  /**
   * Publish to platforms sequentially
   */
  private async publishSequential(
    publishers: BasePlatformPublisher[],
    content: PublishContent,
    timeout: number,
    continueOnError: boolean
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const publisher of publishers) {
      try {
        const result = await this.publishWithTimeout(publisher, content, timeout);
        results.push(result);
      } catch (error) {
        const errorResult: PublishResult = {
          platform: publisher.getPlatformName(),
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        };
        results.push(errorResult);

        if (!continueOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Publish with timeout
   */
  private async publishWithTimeout(
    publisher: BasePlatformPublisher,
    content: PublishContent,
    timeout: number
  ): Promise<PublishResult> {
    return Promise.race([
      publisher.publish(content),
      new Promise<PublishResult>((_, reject) =>
        setTimeout(() => reject(new Error('Publish timeout')), timeout)
      )
    ]);
  }

  /**
   * Check health of all registered platforms
   */
  async checkAllPlatformsHealth(): Promise<Map<PlatformName, boolean>> {
    const healthStatus = new Map<PlatformName, boolean>();

    for (const [platform, publisher] of this.publishers) {
      try {
        const isHealthy = await publisher.checkHealth();
        healthStatus.set(platform, isHealthy);
      } catch {
        healthStatus.set(platform, false);
      }
    }

    return healthStatus;
  }

  /**
   * Refresh authentication for all platforms
   */
  async refreshAllAuth(): Promise<void> {
    const promises = Array.from(this.publishers.values()).map(publisher =>
      publisher.refreshAuth().catch(error => {
        // Log error but continue with other platforms
        const platformName = publisher.getPlatformName();
        throw new Error(`Failed to refresh auth for ${platformName}: ${error.message}`);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get registered platforms
   */
  getRegisteredPlatforms(): PlatformName[] {
    return Array.from(this.publishers.keys());
  }

  /**
   * Calculate success rate
   */
  static calculateSuccessRate(result: BatchPublishResult): number {
    if (result.totalPlatforms === 0) return 0;
    return (result.successCount / result.totalPlatforms) * 100;
  }
}