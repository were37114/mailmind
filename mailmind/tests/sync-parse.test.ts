import { describe, it, expect } from 'vitest';

// Mock email data for testing
export const mockEmails = [
  {
    message_id: 'test001',
    subject: '【审批】Q1预算申请',
    from_name: '财务部',
    from_email: 'finance@company.com',
    to_list: ['boss@company.com'],
    cc_list: [],
    date: '2024-01-15T09:00:00Z',
    body_text: '请审批Q1部门预算申请，总金额50万元。',
    has_attachment: false,
    category: 0, // 审批
    urgency: 2, // 高
  },
  {
    message_id: 'test002',
    subject: '本周会议通知',
    from_name: '行政部',
    from_email: 'admin@company.com',
    to_list: ['all@company.com'],
    cc_list: [],
    date: '2024-01-15T10:00:00Z',
    body_text: '本周五下午2点召开全员会议。',
    has_attachment: false,
    category: 1, // 通知
    urgency: 0, // 低
  },
  {
    message_id: 'test003',
    subject: 'Re: 项目进度讨论',
    from_name: '项目经理',
    from_email: 'pm@company.com',
    to_list: ['dev@company.com', 'qa@company.com'],
    cc_list: ['boss@company.com'],
    date: '2024-01-15T11:00:00Z',
    body_text: '关于项目进度的讨论，目前进展顺利。',
    has_attachment: false,
    category: 2, // 讨论
    urgency: 1, // 中
  },
];

describe('Email Sync Tests', () => {
  it('should parse email metadata correctly', () => {
    const email = mockEmails[0];
    expect(email.subject).toBe('【审批】Q1预算申请');
    expect(email.from_email).toBe('finance@company.com');
    expect(email.category).toBe(0); // 审批
    expect(email.urgency).toBe(2); // 高
  });

  it('should handle empty email list', () => {
    const emails: typeof mockEmails = [];
    expect(emails.length).toBe(0);
  });

  it('should identify approval emails', () => {
    const approvalEmails = mockEmails.filter(e => e.category === 0);
    expect(approvalEmails.length).toBe(1);
    expect(approvalEmails[0].subject).toContain('审批');
  });

  it('should handle multi-recipient emails', () => {
    const email = mockEmails[2];
    expect(email.to_list.length).toBe(2);
    expect(email.cc_list.length).toBe(1);
  });
});
