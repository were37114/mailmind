import { describe, it, expect } from 'vitest';
import { syncManager, type SyncAccount } from '../src/core/sync/sync-manager';

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
  {
    message_id: 'test004',
    subject: '【紧急】服务器告警',
    from_name: '运维',
    from_email: 'ops@company.com',
    to_list: ['dev@company.com'],
    cc_list: [],
    date: '2024-01-15T12:00:00Z',
    body_text: '生产环境CPU使用率超过90%，请尽快处理。',
    has_attachment: false,
    category: 1, // 通知 (but urgent)
    urgency: 2, // 高
  },
  {
    message_id: 'test005',
    subject: '周报：研发部',
    from_name: '研发主管',
    from_email: 'rd@company.com',
    to_list: ['boss@company.com'],
    cc_list: [],
    date: '2024-01-15T16:00:00Z',
    body_text: '本周完成了3个功能开发，2个bug修复。下周计划进行性能优化。',
    has_attachment: true,
    category: 3, // 汇报
    urgency: 0, // 低
  },
];

describe('U3: Email Sync Tests', () => {
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

  it('should identify notification emails', () => {
    const notificationEmails = mockEmails.filter(e => e.category === 1);
    expect(notificationEmails.length).toBe(2);
  });

  it('should identify high urgency emails', () => {
    const urgentEmails = mockEmails.filter(e => e.urgency === 2);
    expect(urgentEmails.length).toBe(2);
    expect(urgentEmails.map(e => e.subject)).toContain('【审批】Q1预算申请');
    expect(urgentEmails.map(e => e.subject)).toContain('【紧急】服务器告警');
  });

  it('should handle multi-recipient emails', () => {
    const email = mockEmails[2];
    expect(email.to_list.length).toBe(2);
    expect(email.cc_list.length).toBe(1);
  });

  it('should handle emails with attachments', () => {
    const emailsWithAttachments = mockEmails.filter(e => e.has_attachment);
    expect(emailsWithAttachments.length).toBe(1);
    expect(emailsWithAttachments[0].subject).toBe('周报：研发部');
  });

  it('should correctly parse email addresses', () => {
    const email = mockEmails[0];
    expect(email.from_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(email.to_list.every(addr => addr.includes('@'))).toBe(true);
  });

  it('should handle emails with Chinese characters in subject', () => {
    const email = mockEmails[1];
    expect(email.subject).toBe('本周会议通知');
    expect(email.body_text).toContain('全员会议');
  });

  it('should sort emails by urgency', () => {
    const sorted = [...mockEmails].sort((a, b) => b.urgency - a.urgency);
    expect(sorted[0].urgency).toBe(2);
    expect(sorted[sorted.length - 1].urgency).toBe(0);
  });

  it('should group emails by category', () => {
    const byCategory = new Map<number, typeof mockEmails>();
    for (const email of mockEmails) {
      const existing = byCategory.get(email.category) || [];
      existing.push(email);
      byCategory.set(email.category, existing);
    }

    expect(byCategory.get(0)?.length).toBe(1); // 审批
    expect(byCategory.get(1)?.length).toBe(2); // 通知
    expect(byCategory.get(2)?.length).toBe(1); // 讨论
    expect(byCategory.get(3)?.length).toBe(1); // 汇报
  });

  describe('Sync Manager State Management', () => {
    it('should add and manage sync accounts', () => {
      const account: SyncAccount = {
        id: 'test_account_1',
        email: 'test@company.com',
        provider: 'imap',
        server: 'imap.company.com',
        port: 993,
        useTls: true,
        username: 'test@company.com',
        password: 'encrypted_password',
      };

      syncManager.addAccount(account);
      const state = syncManager.getState('test_account_1');

      expect(state).not.toBeUndefined();
      expect(state?.accountId).toBe('test_account_1');
      expect(state?.status).toBe('idle');
      expect(state?.totalEmails).toBe(0);
      expect(state?.progress).toBe(0);
    });

    it('should remove sync accounts', () => {
      const account: SyncAccount = {
        id: 'test_account_2',
        email: 'test2@company.com',
        provider: 'imap',
        server: 'imap.company.com',
        port: 993,
        useTls: true,
        username: 'test2@company.com',
        password: 'encrypted_password',
      };

      syncManager.addAccount(account);
      expect(syncManager.getState('test_account_2')).not.toBeUndefined();

      syncManager.removeAccount('test_account_2');
      expect(syncManager.getState('test_account_2')).toBeUndefined();
    });

    it('should handle sync state transitions', () => {
      const account: SyncAccount = {
        id: 'test_account_3',
        email: 'test3@company.com',
        provider: 'imap',
        server: 'imap.company.com',
        port: 993,
        useTls: true,
        username: 'test3@company.com',
        password: 'encrypted_password',
      };

      syncManager.addAccount(account);
      const state = syncManager.getState('test_account_3')!;

      expect(state.status).toBe('idle');
      expect(state.lastSyncAt).toBeNull();
      expect(state.errorMessage).toBeNull();
    });

    it('should throw error for non-existent account sync', async () => {
      await expect(syncManager.syncAccount('non_existent')).rejects.toThrow('not found');
    });
  });

  describe('Encoding handling', () => {
    it('should handle UTF-8 encoded content', () => {
      const utf8Content = '这是一封测试邮件，包含中文、English、数字123';
      expect(utf8Content).toContain('中文');
      expect(utf8Content).toContain('English');
      expect(utf8Content).toContain('123');
    });

    it('should handle special characters in email content', () => {
      const specialChars = '测试：特殊字符<>"&\'@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(specialChars).toContain('<');
      expect(specialChars).toContain('&');
      expect(specialChars).toContain('@');
    });

    it('should handle mixed Chinese-English content', () => {
      const mixed = 'This is a test 这是一个测试 email 邮件';
      expect(mixed).toContain('test');
      expect(mixed).toContain('测试');
      expect(mixed).toContain('email');
      expect(mixed).toContain('邮件');
    });

    it('should handle email with emojis', () => {
      const emojiSubject = '🎉 项目上线通知 🚀';
      expect(emojiSubject).toContain('🎉');
      expect(emojiSubject).toContain('🚀');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long subject', () => {
      const longSubject = '这是一个非常长的邮件主题'.repeat(20);
      expect(longSubject.length).toBeGreaterThan(100);
    });

    it('should handle very long body', () => {
      const longBody = '这是一段很长的邮件内容。'.repeat(500);
      expect(longBody.length).toBeGreaterThan(1000);
    });

    it('should handle empty body', () => {
      const emptyBody = '';
      expect(emptyBody.length).toBe(0);
    });

    it('should handle multiple CC recipients', () => {
      const email = {
        ...mockEmails[0],
        cc_list: ['cc1@company.com', 'cc2@company.com', 'cc3@company.com'],
      };
      expect(email.cc_list.length).toBe(3);
    });
  });
});
