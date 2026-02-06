/**
 * WeChat Publisher Tests
 */

import { WeChatPublisher } from './wechat';
import { PublishContent, PlatformConfig } from './base';

describe('WeChatPublisher', () => {
  let publisher: WeChatPublisher;
  const config: PlatformConfig = {
    apiKey: 'test_app_id',
    apiSecret: 'test_app_secret',
    maxRetries: 2,
    timeout: 5000
  };

  beforeEach(() => {
    publisher = new WeChatPublisher(config);
  });

  describe('validateContent', () => {
    it('should validate valid content', async () => {
      const content: PublishContent = {
        title: 'Test Article',
        text: 'This is test content',
        images: ['image1.jpg', 'image2.jpg']
      };

      const result = await publisher.validateContent(content);
      expect(result).toBe(true);
    });

    it('should reject content without text', async () => {
      const content: PublishContent = {
        title: 'Test Article',
        text: ''
      };

      const result = await publisher.validateContent(content);
      expect(result).toBe(false);
    });

    it('should reject content without title', async () => {
      const content: PublishContent = {
        text: 'This is test content'
      };

      const result = await publisher.validateContent(content);
      expect(result).toBe(false);
    });

    it('should reject content with title too long', async () => {
      const content: PublishContent = {
        title: 'a'.repeat(65),
        text: 'This is test content'
      };

      const result = await publisher.validateContent(content);
      expect(result).toBe(false);
    });

    it('should reject content with too many images', async () => {
      const content: PublishContent = {
        title: 'Test Article',
        text: 'This is test content',
        images: Array(9).fill('image.jpg')
      };

      const result = await publisher.validateContent(content);
      expect(result).toBe(false);
    });
  });

  describe('adaptContent', () => {
    it('should truncate long title', async () => {
      const content: PublishContent = {
        title: 'a'.repeat(70),
        text: 'This is test content'
      };

      const adapted = await publisher.adaptContent(content);
      expect(adapted.title).toHaveLength(64);
      expect(adapted.title).toMatch(/\.\.\.$/);
    });

    it('should convert text to HTML', async () => {
      const content: PublishContent = {
        title: 'Test',
        text: 'Line 1\nLine 2\n**bold** and *italic*'
      };

      const adapted = await publisher.adaptContent(content);
      expect(adapted.text).toContain('<br>');
      expect(adapted.text).toContain('<strong>bold</strong>');
      expect(adapted.text).toContain('<em>italic</em>');
    });

    it('should process images', async () => {
      const content: PublishContent = {
        title: 'Test',
        text: 'Content',
        images: ['image1.jpg', 'image2.jpg']
      };

      const adapted = await publisher.adaptContent(content);
      expect(adapted.images).toBeDefined();
      expect(adapted.images![0]).toMatch(/^wechat:\/\/media\//);
    });
  });

  describe('publish', () => {
    it('should publish valid content successfully', async () => {
      const content: PublishContent = {
        title: 'Test Article',
        text: 'This is test content',
        images: ['image1.jpg']
      };

      const result = await publisher.publish(content);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('WeChat');
      expect(result.postId).toBeDefined();
      expect(result.url).toBeDefined();
    });

    it('should fail with invalid content', async () => {
      const content: PublishContent = {
        text: '' // Missing required fields
      };

      const result = await publisher.publish(content);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.platform).toBe('WeChat');
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      const isHealthy = await publisher.checkHealth();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('refreshAuth', () => {
    it('should refresh access token', async () => {
      await expect(publisher.refreshAuth()).resolves.not.toThrow();
    });

    it('should throw error without credentials', async () => {
      const invalidPublisher = new WeChatPublisher({});
      await expect(invalidPublisher.refreshAuth()).rejects.toThrow(
        'API credentials not configured'
      );
    });
  });
});