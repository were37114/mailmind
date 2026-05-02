import { describe, it, expect } from 'vitest';
import { approvalRuleEngine } from '../../src/core/approval/rule-engine';
import type { Email } from '../../src/types';

const makeEmail = (overrides: Partial<Email> & { id: number; subject: string }): Email => ({
  message_id: `m${overrides.id}`,
  thread_id: null,
  account_id: 'a1',
  from_name: 'Test',
  from_email: 'test@company.com',
  to_list: [],
  cc_list: [],
  body_text: '',
  date: new Date(),
  has_attachment: false,
  category: 4,
  urgency: 0,
  confidence: 0.5,
  created_at: new Date(),
  ...overrides,
});

describe('ApprovalRuleEngine', () => {
  it('matches emails with approval keywords', () => {
    const emails = [
      makeEmail({ id: 1, subject: '【审批】Q1预算申请' }),
      makeEmail({ id: 2, subject: '本周会议通知' }),
      makeEmail({ id: 3, subject: '请审批出差申请' }),
    ];

    const matches = approvalRuleEngine.recall(emails);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some(m => m.email.id === 1)).toBe(true);
    expect(matches.some(m => m.email.id === 3)).toBe(true);
  });

  it('matches emails from approval sender domains', () => {
    const emails = [
      makeEmail({ id: 10, subject: '月度报告', from_email: 'admin@company.com', body_text: '请确认' }),
    ];

    const matches = approvalRuleEngine.recall(emails);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for non-approval emails', () => {
    const emails = [
      makeEmail({ id: 20, subject: '午餐吃什么' }),
      makeEmail({ id: 21, subject: '天气不错' }),
    ];

    const matches = approvalRuleEngine.recall(emails);
    expect(matches).toHaveLength(0);
  });

  it('sorts by score descending', () => {
    const emails = [
      makeEmail({ id: 30, subject: '请审批', from_email: 'finance@bank.com' }),
      makeEmail({ id: 31, subject: '审批通知', category: 0, urgency: 2 }),
    ];

    const matches = approvalRuleEngine.recall(emails);
    if (matches.length >= 2) {
      expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    }
  });
});
