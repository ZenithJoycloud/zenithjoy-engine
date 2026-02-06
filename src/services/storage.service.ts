/**
 * 数据存储服务
 */

import { TrafficData, TrafficSummary, PlatformType } from '../models/traffic.model';
import { BaselineData, BaselineMode } from '../models/baseline.model';

/**
 * 查询选项接口
 */
export interface QueryOptions {
  platform?: PlatformType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  includeAnomalies?: boolean;
  sortBy?: 'timestamp' | 'pageViews' | 'uniqueVisitors';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 存储服务类
 */
export class StorageService {
  // 内存存储（实际项目中应使用数据库）
  private trafficData: Map<string, TrafficData> = new Map();
  private baselineData: Map<string, BaselineData> = new Map();
  private idCounter = 1;

  /**
   * 保存流量数据
   * @param data 流量数据
   * @returns 保存后的数据（包含 ID）
   */
  async saveTrafficData(data: TrafficData): Promise<TrafficData> {
    const id = data.id || this.generateId();
    const dataWithId = {
      ...data,
      id,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.trafficData.set(id, dataWithId);
    return dataWithId;
  }

  /**
   * 批量保存流量数据
   * @param dataArray 流量数据数组
   * @returns 保存后的数据数组
   */
  async saveTrafficDataBatch(dataArray: TrafficData[]): Promise<TrafficData[]> {
    const savedData: TrafficData[] = [];

    for (const data of dataArray) {
      const saved = await this.saveTrafficData(data);
      savedData.push(saved);
    }

    return savedData;
  }

  /**
   * 查询流量数据
   * @param options 查询选项
   * @returns 符合条件的流量数据
   */
  async queryTrafficData(options: QueryOptions = {}): Promise<TrafficData[]> {
    let results = Array.from(this.trafficData.values());

    // 平台筛选
    if (options.platform) {
      results = results.filter(item => item.platform === options.platform);
    }

    // 时间范围筛选
    if (options.startDate) {
      results = results.filter(item => new Date(item.timestamp) >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(item => new Date(item.timestamp) <= options.endDate!);
    }

    // 异常数据筛选
    if (options.includeAnomalies === false) {
      results = results.filter(item => !item.isAnomaly);
    }

    // 排序
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    results.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'pageViews':
          aVal = a.pageViews;
          bVal = b.pageViews;
          break;
        case 'uniqueVisitors':
          aVal = a.uniqueVisitors;
          bVal = b.uniqueVisitors;
          break;
        default:
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * 获取流量数据汇总
   * @param platform 平台类型
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 流量数据汇总
   */
  async getTrafficSummary(
    platform: PlatformType,
    startDate: Date,
    endDate: Date
  ): Promise<TrafficSummary> {
    const data = await this.queryTrafficData({
      platform,
      startDate,
      endDate,
      includeAnomalies: false,
    });

    if (data.length === 0) {
      return {
        platform,
        period: { start: startDate, end: endDate },
        totalPageViews: 0,
        totalUniqueVisitors: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        avgBounceRate: 0,
        dataPoints: 0,
      };
    }

    const summary: TrafficSummary = {
      platform,
      period: { start: startDate, end: endDate },
      totalPageViews: data.reduce((sum, item) => sum + item.pageViews, 0),
      totalUniqueVisitors: data.reduce((sum, item) => sum + item.uniqueVisitors, 0),
      totalSessions: data.reduce((sum, item) => sum + item.sessions, 0),
      avgSessionDuration:
        data.reduce((sum, item) => sum + item.avgSessionDuration, 0) / data.length,
      avgBounceRate:
        data.reduce((sum, item) => sum + item.bounceRate, 0) / data.length,
      dataPoints: data.length,
    };

    return summary;
  }

  /**
   * 保存基线数据
   * @param data 基线数据
   * @returns 保存后的基线数据
   */
  async saveBaselineData(data: BaselineData): Promise<BaselineData> {
    const id = data.id || this.generateId();
    const dataWithId = {
      ...data,
      id,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.baselineData.set(id, dataWithId);
    return dataWithId;
  }

  /**
   * 查询基线数据
   * @param platform 平台类型
   * @param mode 基线模式
   * @returns 最新的基线数据
   */
  async queryBaselineData(
    platform: PlatformType,
    mode: BaselineMode
  ): Promise<BaselineData | null> {
    const baselines = Array.from(this.baselineData.values())
      .filter(item => item.platform === platform && item.mode === mode)
      .sort((a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

    return baselines.length > 0 ? baselines[0] : null;
  }

  /**
   * 删除过期数据
   * @param beforeDate 删除此日期之前的数据
   * @returns 删除的数据条数
   */
  async deleteOldData(beforeDate: Date): Promise<number> {
    let deletedCount = 0;

    // 删除旧的流量数据
    for (const [id, data] of this.trafficData.entries()) {
      if (new Date(data.timestamp) < beforeDate) {
        this.trafficData.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): {
    trafficDataCount: number;
    baselineDataCount: number;
    platformCounts: Record<string, number>;
    oldestData?: Date;
    newestData?: Date;
  } {
    const trafficDataArray = Array.from(this.trafficData.values());
    const platformCounts: Record<string, number> = {};

    // 统计各平台数据量
    trafficDataArray.forEach(item => {
      platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
    });

    // 找出最早和最新的数据
    const timestamps = trafficDataArray.map(item => new Date(item.timestamp).getTime());
    const oldestData = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined;
    const newestData = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;

    return {
      trafficDataCount: this.trafficData.size,
      baselineDataCount: this.baselineData.size,
      platformCounts,
      oldestData,
      newestData,
    };
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  async clearAll(): Promise<void> {
    this.trafficData.clear();
    this.baselineData.clear();
    this.idCounter = 1;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `data_${Date.now()}_${this.idCounter++}`;
  }
}