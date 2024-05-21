import { describe, test, expect } from '@jest/globals';

describe('Simple Test', function () {
  test('Returns correct value', () => {
    expect(2 + 3).toEqual(5);
  });
});
