/**
 * 流量数据模型定义
 */

/**
 * 平台类型枚举
 */
export enum PlatformType {
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  MOCK = 'mock', // 用于测试
}

/**
 * 流量数据接口
 */
export interface TrafficData {
  /** 唯一标识符 */
  id?: string;

  /** 平台类型 */
  platform: PlatformType;

  /** 时间戳 */
  timestamp: Date;

  /** 页面浏览量 */
  pageViews: number;

  /** 独立访客数 */
  uniqueVisitors: number;

  /** 会话数 */
  sessions: number;

  /** 平均会话时长（秒） */
  avgSessionDuration: number;

  /** 跳出率（百分比） */
  bounceRate: number;

  /** 原始数据（平台特定） */
  rawData?: any;

  /** 数据质量分数（0-100） */
  qualityScore?: number;

  /** 是否为异常数据 */
  isAnomaly?: boolean;

  /** 创建时间 */
  createdAt?: Date;

  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 流量数据汇总
 */
export interface TrafficSummary {
  platform: PlatformType;
  period: {
    start: Date;
    end: Date;
  };
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalSessions: number;
  avgSessionDuration: number;
  avgBounceRate: number;
  dataPoints: number;
}

/**
 * 标准化的流量数据
 */
export class StandardizedTrafficData implements TrafficData {
  id?: string;
  platform: PlatformType;
  timestamp: Date;
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  rawData?: any;
  qualityScore?: number;
  isAnomaly?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: TrafficData) {
    this.platform = data.platform;
    this.timestamp = new Date(data.timestamp);
    this.pageViews = Math.max(0, data.pageViews);
    this.uniqueVisitors = Math.max(0, data.uniqueVisitors);
    this.sessions = Math.max(0, data.sessions);
    this.avgSessionDuration = Math.max(0, data.avgSessionDuration);
    this.bounceRate = Math.max(0, Math.min(100, data.bounceRate));
    this.rawData = data.rawData;
    this.qualityScore = this.calculateQualityScore();
    this.isAnomaly = data.isAnomaly || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * 计算数据质量分数
   */
  private calculateQualityScore(): number {
    let score = 100;

    // 检查数据完整性
    if (this.pageViews === 0) score -= 20;
    if (this.uniqueVisitors === 0) score -= 20;
    if (this.sessions === 0) score -= 20;

    // 检查数据合理性
    if (this.uniqueVisitors > this.pageViews) score -= 15;
    if (this.sessions > this.pageViews) score -= 15;
    if (this.bounceRate === 0 || this.bounceRate === 100) score -= 10;

    return Math.max(0, score);
  }

  /**
   * 转换为 JSON
   */
  toJSON(): TrafficData {
    return {
      id: this.id,
      platform: this.platform,
      timestamp: this.timestamp,
      pageViews: this.pageViews,
      uniqueVisitors: this.uniqueVisitors,
      sessions: this.sessions,
      avgSessionDuration: this.avgSessionDuration,
      bounceRate: this.bounceRate,
      rawData: this.rawData,
      qualityScore: this.qualityScore,
      isAnomaly: this.isAnomaly,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}