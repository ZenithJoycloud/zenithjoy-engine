/**
 * Xiaohongshu (Little Red Book) Publisher
 */

import { BasePlatformPublisher, PublishContent, PublishResult, PlatformConfig } from './base';

export class XiaohongshuPublisher extends BasePlatformPublisher {
  constructor(config: PlatformConfig) {
    super('Xiaohongshu', config);
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    try {
      // Validate content
      const isValid = await this.validateContent(content);
      if (!isValid) {
        throw new Error('Content validation failed');
      }

      // Adapt content to Xiaohongshu format
      const adaptedContent = await this.adaptContent(content);

      // Publish with retry
      const result = await this.retryWithBackoff(async () => {
        return this.doPublish(adaptedContent);
      });

      return {
        platform: this.platformName,
        success: true,
        postId: result.note_id,
        url: result.share_url,
        timestamp: new Date()
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
    // Xiaohongshu requires at least one image
    if (!content.images || content.images.length === 0) {
      return false;
    }

    // Text content is required
    if (!content.text || content.text.length === 0) {
      return false;
    }

    // Text length limit (1000 characters)
    if (content.text.length > 1000) {
      return false;
    }

    // Image count limit (max 9)
    if (content.images.length > 9) {
      return false;
    }

    // Tags limit (max 10)
    if (content.tags && content.tags.length > 10) {
      return false;
    }

    return true;
  }

  async adaptContent(content: PublishContent): Promise<PublishContent> {
    const adapted = { ...content };

    // Use title as first line of content if provided
    if (adapted.title) {
      adapted.text = `${adapted.title}\n\n${adapted.text}`;
    }

    // Truncate text if too long
    if (adapted.text.length > 1000) {
      adapted.text = adapted.text.substring(0, 997) + '...';
    }

    // Convert tags to Xiaohongshu format (add # prefix)
    if (adapted.tags) {
      adapted.tags = adapted.tags
        .slice(0, 10)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
    }

    // Process images for Xiaohongshu
    if (adapted.images) {
      adapted.images = await this.processImages(adapted.images);
    }

    return adapted;
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Mock health check
      const response = await this.mockApiCall('/api/v1/health');
      return response.status === 'healthy';
    } catch {
      return false;
    }
  }

  async refreshAuth(): Promise<void> {
    // Xiaohongshu uses OAuth 2.0
    if (!this.config.refreshToken) {
      throw new Error('Refresh token not configured');
    }

    // Mock token refresh
    const newTokens = await this.mockApiCall('/oauth/refresh', {
      refresh_token: this.config.refreshToken,
      client_id: this.config.apiKey,
      client_secret: this.config.apiSecret
    });

    this.config.accessToken = newTokens.access_token;
    this.config.refreshToken = newTokens.refresh_token;
  }

  private async doPublish(content: PublishContent): Promise<any> {
    // Mock publish - in production would call Xiaohongshu API
    return this.mockApiCall('/api/v1/notes/create', {
      type: 'image_note',
      title: content.title || content.text.substring(0, 20),
      desc: content.text,
      images: content.images,
      tags: content.tags,
      privacy: 'public'
    });
  }

  private async processImages(images: string[]): Promise<string[]> {
    // Mock image processing - resize and optimize for Xiaohongshu
    return images.slice(0, 9).map(img => {
      // In production, would resize to 1:1 or 3:4 aspect ratio
      return `xhs://image/${Math.random().toString(36).substr(2, 9)}`;
    });
  }

  private async mockApiCall(endpoint: string, data?: any): Promise<any> {
    // Mock API call for testing
    return {
      status: 'healthy',
      access_token: 'mock_xhs_token_' + Math.random().toString(36),
      refresh_token: 'mock_xhs_refresh_' + Math.random().toString(36),
      note_id: 'xhs_note_' + Math.random().toString(36),
      share_url: 'https://www.xiaohongshu.com/discovery/item/mock'
    };
  }
}