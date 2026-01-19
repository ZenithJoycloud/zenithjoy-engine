import { describe, it, expect } from 'vitest';
import { ping } from './ping';

describe('ping', () => {
  it('returns "pong"', () => {
    const result = ping();
    expect(result).toBe('pong');
  });

  it('returns a string', () => {
    const result = ping();
    expect(typeof result).toBe('string');
  });

  it('is consistent', () => {
    expect(ping()).toBe(ping());
  });
});
