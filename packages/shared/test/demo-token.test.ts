import { describe, expect, it } from 'vitest';
import { signDemoToken, verifyDemoToken } from '../src/node/demo-token.ts';

describe('demo token', () => {
  it('round-trips and rejects tampering and expiry', () => {
    const { token, sandboxId } = signDemoToken('s3cret', 60);
    expect(verifyDemoToken('s3cret', token)?.sandboxId).toBe(sandboxId);
    expect(verifyDemoToken('other', token)).toBeNull();
    expect(verifyDemoToken('s3cret', token.replace(sandboxId, 'aaaaaaaaaaaa'))).toBeNull();
    expect(verifyDemoToken('s3cret', token, Date.now() + 61_000)).toBeNull();
  });
});
