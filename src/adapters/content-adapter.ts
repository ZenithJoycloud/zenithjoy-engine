/**
 * Content Adapter for different platforms
 */

export class ContentAdapter {
  /**
   * Resize image to specified dimensions
   */
  static async resizeImage(
    imageUrl: string,
    width: number,
    height: number
  ): Promise<string> {
    // Mock implementation - in production would use image processing library
    return `${imageUrl}?w=${width}&h=${height}`;
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(
    text: string,
    maxLength: number,
    suffix: string = '...'
  ): string {
    if (text.length <= maxLength) {
      return text;
    }

    const truncateAt = maxLength - suffix.length;
    return text.substring(0, truncateAt) + suffix;
  }

  /**
   * Convert tags between different platform formats
   */
  static convertTags(tags: string[], platform: string): string[] {
    switch (platform) {
      case 'WeChat':
        // WeChat doesn't use hashtags
        return tags.map(tag => tag.replace(/^#/, ''));

      case 'Xiaohongshu':
      case 'Douyin':
        // These platforms use hashtags
        return tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      case 'Twitter':
        // Twitter hashtags, limit to 280 char total
        return tags
          .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
          .slice(0, 5); // Limit hashtag count

      case 'LinkedIn':
        // LinkedIn hashtags
        return tags
          .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
          .map(tag => tag.replace(/\s+/g, '')); // Remove spaces

      case 'Zhihu':
        // Zhihu topics
        return tags.slice(0, 5); // Max 5 topics

      default:
        return tags;
    }
  }

  /**
   * Convert markdown to platform-specific format
   */
  static convertMarkdown(markdown: string, platform: string): string {
    switch (platform) {
      case 'WeChat':
        return this.markdownToHTML(markdown);

      case 'Zhihu':
        // Zhihu supports markdown directly
        return markdown;

      case 'LinkedIn':
        // LinkedIn has limited formatting
        return this.markdownToPlainText(markdown);

      default:
        return this.markdownToPlainText(markdown);
    }
  }

  /**
   * Convert markdown to HTML
   */
  private static markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Convert markdown to plain text
   */
  private static markdownToPlainText(markdown: string): string {
    return markdown
      .replace(/^#+ /gm, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Remove links
      .replace(/`([^`]+)`/g, '$1') // Remove code
      .replace(/^[-*+] /gm, '• ') // Convert lists
      .replace(/^\d+\. /gm, ''); // Remove numbered lists
  }

  /**
   * Optimize content for specific platform
   */
  static optimizeForPlatform(
    content: string,
    platform: string
  ): { optimized: string; warnings?: string[] } {
    const warnings: string[] = [];
    let optimized = content;

    switch (platform) {
      case 'Twitter':
        if (content.length > 280) {
          warnings.push('Content truncated to 280 characters');
          optimized = this.truncateText(content, 280);
        }
        break;

      case 'WeChat':
        if (content.length > 20000) {
          warnings.push('Content truncated to 20000 characters');
          optimized = this.truncateText(content, 20000);
        }
        break;

      case 'Xiaohongshu':
        if (content.length > 1000) {
          warnings.push('Content truncated to 1000 characters');
          optimized = this.truncateText(content, 1000);
        }
        break;

      case 'LinkedIn':
        if (content.length > 3000) {
          warnings.push('Content truncated to 3000 characters');
          optimized = this.truncateText(content, 3000);
        }
        break;
    }

    return { optimized, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Extract and format metadata for platforms
   */
  static extractMetadata(content: string): {
    title?: string;
    summary?: string;
    tags?: string[];
    mentions?: string[];
  } {
    const lines = content.split('\n');
    const metadata: any = {};

    // Extract title (first line or first heading)
    const firstLine = lines[0];
    if (firstLine) {
      metadata.title = firstLine.replace(/^#+ /, '').trim();
    }

    // Extract summary (first paragraph)
    const firstParagraph = lines
      .slice(1)
      .find(line => line.trim().length > 0 && !line.startsWith('#'));
    if (firstParagraph) {
      metadata.summary = this.truncateText(firstParagraph, 160);
    }

    // Extract hashtags
    const hashtags = content.match(/#\w+/g);
    if (hashtags) {
      metadata.tags = [...new Set(hashtags)];
    }

    // Extract mentions
    const mentions = content.match(/@\w+/g);
    if (mentions) {
      metadata.mentions = [...new Set(mentions)];
    }

    return metadata;
  }
}