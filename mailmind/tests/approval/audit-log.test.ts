import { describe, it, expect, beforeEach } from 'vitest';
import { auditLog } from '../../src/core/approval/audit-log';

beforeEach(() => {
  (auditLog as any).entries = [];
});

describe('AuditLog', () => {
  it('appends entries with correct structure', () => {
    const entry = auditLog.append(1, 'approved', 'user1', 'Approved');
    expect(entry.emailId).toBe(1);
    expect(entry.action).toBe('approved');
    expect(entry.operator).toBe('user1');
    expect(entry.hash).toBeDefined();
    expect(entry.prevHash).toBe('genesis');
  });

  it('chains entries with prevHash', () => {
    const entry1 = auditLog.append(1, 'viewed', 'user1');
    const entry2 = auditLog.append(2, 'approved', 'user1', 'OK');
    expect(entry2.prevHash).toBe(entry1.hash);
  });

  it('verifies intact chain', () => {
    auditLog.append(1, 'viewed', 'u1');
    auditLog.append(1, 'approved', 'u1');
    auditLog.append(2, 'rejected', 'u1');
    expect(auditLog.verifyChain()).toBe(true);
  });

  it('filters entries by emailId', () => {
    auditLog.append(1, 'viewed', 'u1');
    auditLog.append(2, 'viewed', 'u1');
    auditLog.append(1, 'approved', 'u1');
    const filtered = auditLog.getEntries(1);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(e => e.emailId === 1)).toBe(true);
  });
});
