/**
 * Base interface and abstract class for all platform publishers
 */

export interface PublishContent {
  title?: string;
  text: string;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
  retryCount?: number;
}

export interface PlatformConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  endpoint?: string;
  timeout?: number;
  maxRetries?: number;
}

export abstract class BasePlatformPublisher {
  protected config: PlatformConfig;
  protected platformName: string;

  constructor(platformName: string, config: PlatformConfig) {
    this.platformName = platformName;
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Publish content to the platform
   */
  abstract publish(content: PublishContent): Promise<PublishResult>;

  /**
   * Validate content before publishing
   */
  abstract validateContent(content: PublishContent): Promise<boolean>;

  /**
   * Adapt content to platform-specific format
   */
  abstract adaptContent(content: PublishContent): Promise<PublishContent>;

  /**
   * Check if the platform is available
   */
  abstract checkHealth(): Promise<boolean>;

  /**
   * Refresh authentication tokens if needed
   */
  abstract refreshAuth(): Promise<void>;

  /**
   * Common retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get platform name
   */
  getPlatformName(): string {
    return this.platformName;
  }
}