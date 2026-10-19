import { describe, expect, it } from 'vitest';
import { median } from './stats.js';

describe('median', () => {
  it('returns the middle value for an odd number of values', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('returns the mean of the two middle values for an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('is not pulled by an outlier (19 x 70 ms and one 400 ms run)', () => {
    const runs = [...Array.from({ length: 19 }, () => 70), 400];
    expect(median(runs)).toBe(70);
  });

  it('does not mutate the input array', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it('throws on an empty array', () => {
    expect(() => median([])).toThrow();
  });
});
