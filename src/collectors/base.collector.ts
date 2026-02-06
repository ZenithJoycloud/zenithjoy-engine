/**
 * 基础数据采集器抽象类
 */

import { TrafficData, StandardizedTrafficData, PlatformType } from '../models/traffic.model';

/**
 * 采集器配置接口
 */
export interface CollectorConfig {
  /** 平台类型 */
  platform: PlatformType;

  /** API 端点 */
  apiEndpoint?: string;

  /** API 密钥 */
  apiKey?: string;

  /** 重试次数 */
  maxRetries?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 批量大小 */
  batchSize?: number;
}

/**
 * 采集结果接口
 */
export interface CollectionResult {
  /** 是否成功 */
  success: boolean;

  /** 采集的数据 */
  data?: TrafficData[];

  /** 错误信息 */
  error?: string;

  /** 采集耗时（毫秒） */
  duration?: number;

  /** 重试次数 */
  retryCount?: number;
}

/**
 * 基础采集器抽象类
 */
export abstract class BaseCollector {
  protected config: CollectorConfig;
  protected isRunning: boolean = false;

  /**
   * 构造函数
   * @param config 采集器配置
   */
  constructor(config: CollectorConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      batchSize: 100,
      ...config,
    };
  }

  /**
   * 采集数据（带重试机制）
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 采集结果
   */
  async collect(startDate: Date, endDate: Date): Promise<CollectionResult> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let i = 0; i <= (this.config.maxRetries || 3); i++) {
      try {
        // 调用具体实现的采集方法
        const rawData = await this.fetchData(startDate, endDate);

        // 标准化数据
        const standardizedData = await this.standardizeData(rawData);

        // 验证数据
        const validatedData = this.validateData(standardizedData);

        return {
          success: true,
          data: validatedData,
          duration: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (i < (this.config.maxRetries || 3)) {
          // 等待后重试
          await this.delay(this.config.retryDelay || 1000);
          console.log(`Retrying collection for ${this.config.platform}, attempt ${i + 1}/${this.config.maxRetries}`);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
      duration: Date.now() - startTime,
      retryCount,
    };
  }

  /**
   * 并行采集多个时间段
   * @param periods 时间段数组
   * @returns 所有采集结果
   */
  async collectBatch(periods: Array<{ start: Date; end: Date }>): Promise<CollectionResult[]> {
    const batchSize = this.config.batchSize || 100;
    const results: CollectionResult[] = [];

    for (let i = 0; i < periods.length; i += batchSize) {
      const batch = periods.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(period => this.collect(period.start, period.end))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 抽象方法：获取原始数据
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 原始数据
   */
  protected abstract fetchData(startDate: Date, endDate: Date): Promise<any>;

  /**
   * 抽象方法：标准化数据
   * @param rawData 原始数据
   * @returns 标准化后的流量数据
   */
  protected abstract standardizeData(rawData: any): Promise<StandardizedTrafficData[]>;

  /**
   * 验证数据质量
   * @param data 待验证的数据
   * @returns 验证后的数据
   */
  protected validateData(data: StandardizedTrafficData[]): TrafficData[] {
    return data.filter(item => {
      // 基本验证
      if (!item.timestamp || !item.platform) {
        return false;
      }

      // 质量分数验证（可配置阈值）
      if ((item.qualityScore || 0) < 30) {
        console.warn(`Low quality data detected for ${item.platform} at ${item.timestamp}`);
        // 可以选择过滤掉低质量数据
        // return false;
      }

      return true;
    }).map(item => item.toJSON());
  }

  /**
   * 延迟工具函数
   * @param ms 延迟毫秒数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成时间序列
   * @param start 开始时间
   * @param end 结束时间
   * @param intervalHours 间隔小时数
   * @returns 时间点数组
   */
  protected generateTimeSeries(start: Date, end: Date, intervalHours: number = 24): Date[] {
    const series: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      series.push(new Date(current));
      current.setHours(current.getHours() + intervalHours);
    }

    return series;
  }

  /**
   * 获取采集器状态
   */
  getStatus(): { platform: PlatformType; isRunning: boolean; config: CollectorConfig } {
    return {
      platform: this.config.platform,
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}