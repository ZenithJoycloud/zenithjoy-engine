/**
 * Content Adapter Tests
 */

import { ContentAdapter } from './content-adapter';

describe('ContentAdapter', () => {
  describe('truncateText', () => {
    it('should not truncate text shorter than limit', () => {
      const text = 'Short text';
      const result = ContentAdapter.truncateText(text, 20);
      expect(result).toBe(text);
    });

    it('should truncate text longer than limit', () => {
      const text = 'This is a very long text that needs to be truncated';
      const result = ContentAdapter.truncateText(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should use custom suffix', () => {
      const text = 'Long text here';
      const result = ContentAdapter.truncateText(text, 10, '…');
      expect(result).toBe('Long text…');
    });
  });

  describe('convertTags', () => {
    const tags = ['technology', 'ai', 'development'];

    it('should convert tags for WeChat (no hashtags)', () => {
      const result = ContentAdapter.convertTags(
        ['#tech', 'ai'],
        'WeChat'
      );
      expect(result).toEqual(['tech', 'ai']);
    });

    it('should add hashtags for Xiaohongshu', () => {
      const result = ContentAdapter.convertTags(tags, 'Xiaohongshu');
      expect(result).toEqual(['#technology', '#ai', '#development']);
    });

    it('should limit Twitter hashtags', () => {
      const manyTags = Array(10).fill('tag').map((t, i) => `${t}${i}`);
      const result = ContentAdapter.convertTags(manyTags, 'Twitter');
      expect(result.length).toBe(5);
      expect(result[0]).toMatch(/^#/);
    });

    it('should remove spaces for LinkedIn', () => {
      const result = ContentAdapter.convertTags(
        ['machine learning', 'ai tech'],
        'LinkedIn'
      );
      expect(result).toEqual(['#machinelearning', '#aitech']);
    });

    it('should limit Zhihu topics', () => {
      const manyTags = Array(10).fill('topic').map((t, i) => `${t}${i}`);
      const result = ContentAdapter.convertTags(manyTags, 'Zhihu');
      expect(result.length).toBe(5);
    });
  });

  describe('convertMarkdown', () => {
    const markdown = `# Title
## Subtitle
This is **bold** and *italic* text.
[Link](https://example.com)`;

    it('should convert markdown to HTML for WeChat', () => {
      const result = ContentAdapter.convertMarkdown(markdown, 'WeChat');
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<a href="https://example.com">Link</a>');
    });

    it('should keep markdown for Zhihu', () => {
      const result = ContentAdapter.convertMarkdown(markdown, 'Zhihu');
      expect(result).toBe(markdown);
    });

    it('should convert to plain text for LinkedIn', () => {
      const result = ContentAdapter.convertMarkdown(markdown, 'LinkedIn');
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('[');
      expect(result).toContain('Title');
      expect(result).toContain('bold');
    });
  });

  describe('optimizeForPlatform', () => {
    const longText = 'a'.repeat(5000);

    it('should truncate for Twitter', () => {
      const result = ContentAdapter.optimizeForPlatform(longText, 'Twitter');
      expect(result.optimized.length).toBe(280);
      expect(result.warnings).toContain('Content truncated to 280 characters');
    });

    it('should truncate for Xiaohongshu', () => {
      const result = ContentAdapter.optimizeForPlatform(longText, 'Xiaohongshu');
      expect(result.optimized.length).toBe(1000);
      expect(result.warnings).toContain('Content truncated to 1000 characters');
    });

    it('should not truncate short content', () => {
      const shortText = 'Short content';
      const result = ContentAdapter.optimizeForPlatform(shortText, 'Twitter');
      expect(result.optimized).toBe(shortText);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('extractMetadata', () => {
    it('should extract title from heading', () => {
      const content = `# Main Title

This is the content with #hashtag and @mention.
More text here.`;

      const metadata = ContentAdapter.extractMetadata(content);
      expect(metadata.title).toBe('Main Title');
    });

    it('should extract summary', () => {
      const content = `Title

This is the first paragraph that should be the summary.

Another paragraph.`;

      const metadata = ContentAdapter.extractMetadata(content);
      expect(metadata.summary).toBeDefined();
      expect(metadata.summary).toContain('first paragraph');
    });

    it('should extract hashtags', () => {
      const content = 'Content with #ai #technology #development tags';
      const metadata = ContentAdapter.extractMetadata(content);
      expect(metadata.tags).toEqual(['#ai', '#technology', '#development']);
    });

    it('should extract mentions', () => {
      const content = 'Hello @user1 and @user2!';
      const metadata = ContentAdapter.extractMetadata(content);
      expect(metadata.mentions).toEqual(['@user1', '@user2']);
    });

    it('should handle content without metadata', () => {
      const content = 'Plain text without any special markers';
      const metadata = ContentAdapter.extractMetadata(content);
      expect(metadata.title).toBe('Plain text without any special markers');
      expect(metadata.tags).toBeUndefined();
      expect(metadata.mentions).toBeUndefined();
    });
  });

  describe('resizeImage', () => {
    it('should append resize parameters to URL', async () => {
      const url = 'https://example.com/image.jpg';
      const result = await ContentAdapter.resizeImage(url, 800, 600);
      expect(result).toBe('https://example.com/image.jpg?w=800&h=600');
    });
  });
});