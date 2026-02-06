/**
 * Platform publishers export
 */

export { BasePlatformPublisher, PublishContent, PublishResult, PlatformConfig } from './base';
export { WeChatPublisher } from './wechat';
export { XiaohongshuPublisher } from './xiaohongshu';

// Platform names enum for type safety
export enum PlatformName {
  WeChat = 'WeChat',
  Xiaohongshu = 'Xiaohongshu',
  Douyin = 'Douyin',
  Zhihu = 'Zhihu',
  LinkedIn = 'LinkedIn',
  Twitter = 'Twitter'
}