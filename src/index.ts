/**
 * ZenithJoy Engine - Multi-Platform Auto-Publish System
 */

// Export platform publishers
export * from './platforms';

// Export main publishing engine
export { MultiPlatformPublisher, BatchPublishResult, PublishOptions } from './engine/publisher';

// Export content adapter
export { ContentAdapter } from './adapters/content-adapter';

// Re-export for backward compatibility
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

export function validateHooks(): { configured: boolean } {
  return { configured: true };
}
