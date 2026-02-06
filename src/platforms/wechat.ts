/**
 * WeChat Official Account Publisher
 */

import { BasePlatformPublisher, PublishContent, PublishResult, PlatformConfig } from './base';

export class WeChatPublisher extends BasePlatformPublisher {
  constructor(config: PlatformConfig) {
    super('WeChat', config);
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    const startTime = new Date();

    try {
      // Validate content
      const isValid = await this.validateContent(content);
      if (!isValid) {
        throw new Error('Content validation failed');
      }

      // Adapt content to WeChat format
      const adaptedContent = await this.adaptContent(content);

      // Publish with retry
      const result = await this.retryWithBackoff(async () => {
        return this.doPublish(adaptedContent);
      });

      return {
        platform: this.platformName,
        success: true,
        postId: result.media_id,
        url: result.url,
        timestamp: new Date(),
        retryCount: 0
      };
    } catch (error) {
      return {
        platform: this.platformName,
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  async validateContent(content: PublishContent): Promise<boolean> {
    // WeChat specific validation
    if (!content.text || content.text.length === 0) {
      return false;
    }

    // WeChat article title is required
    if (!content.title || content.title.length === 0) {
      return false;
    }

    // Title length limit
    if (content.title.length > 64) {
      return false;
    }

    // Content length limit
    if (content.text.length > 20000) {
      return false;
    }

    // Image count limit (max 8)
    if (content.images && content.images.length > 8) {
      return false;
    }

    return true;
  }

  async adaptContent(content: PublishContent): Promise<PublishContent> {
    const adapted = { ...content };

    // Truncate title if too long
    if (adapted.title && adapted.title.length > 64) {
      adapted.title = adapted.title.substring(0, 61) + '...';
    }

    // Convert text to HTML for WeChat
    adapted.text = this.convertToHTML(adapted.text);

    // Process images for WeChat CDN
    if (adapted.images) {
      adapted.images = await this.uploadImages(adapted.images);
    }

    return adapted;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Mock health check - in production would check API endpoint
      const response = await this.mockApiCall('/cgi-bin/token');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  async refreshAuth(): Promise<void> {
    // WeChat uses access_token that expires every 2 hours
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API credentials not configured');
    }

    // Mock token refresh - in production would call WeChat API
    const newToken = await this.mockApiCall('/cgi-bin/token', {
      grant_type: 'client_credential',
      appid: this.config.apiKey,
      secret: this.config.apiSecret
    });

    this.config.accessToken = newToken.access_token;
  }

  private async doPublish(content: PublishContent): Promise<any> {
    // Mock publish - in production would call WeChat API
    return this.mockApiCall('/cgi-bin/material/add_news', {
      articles: [{
        title: content.title,
        content: content.text,
        thumb_media_id: content.images?.[0] || '',
        author: 'ZenithJoy',
        digest: content.text.substring(0, 100),
        show_cover_pic: 1,
        content_source_url: ''
      }]
    });
  }

  private convertToHTML(text: string): string {
    // Convert markdown to HTML for WeChat
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  private async uploadImages(images: string[]): Promise<string[]> {
    // Mock image upload - in production would upload to WeChat CDN
    return images.map(img => `wechat://media/${Math.random().toString(36).substr(2, 9)}`);
  }

  private async mockApiCall(endpoint: string, data?: any): Promise<any> {
    // Mock API call for testing
    return {
      status: 'ok',
      access_token: 'mock_token_' + Math.random().toString(36),
      media_id: 'mock_media_' + Math.random().toString(36),
      url: 'https://mp.weixin.qq.com/mock_article'
    };
  }
}