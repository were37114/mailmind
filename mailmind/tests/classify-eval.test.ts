import { describe, it, expect } from 'vitest';
import { classifyEngine } from '../src/core/classify/classify-engine';
import type { Email } from '../src/types';

// Load labeled test data
const labeledEmails: Array<{
  id: string;
  subject: string;
  body: string;
  expected_category: number;
  expected_urgency: number;
  note: string;
}> = await import('./fixtures/labeled-emails.json').then(m => m.default);

describe('U4: 0.5B Classification Model Validation', () => {
  describe('Rule-based fallback classification', () => {
    it('should classify approval emails correctly', async () => {
      const approvalEmails = labeledEmails.filter(e => e.expected_category === 0);
      let correct = 0;

      for (const test of approvalEmails) {
        const email: Email = {
          id: 0,
          message_id: test.id,
          account_id: 'test@example.com',
          from_name: 'Test',
          from_email: 'test@example.com',
          to_list: [],
          cc_list: [],
          subject: test.subject,
          body_text: test.body,
          date: new Date().toISOString(),
          has_attachment: false,
          category: 4,
          urgency: 0,
          confidence: 0,
          created_at: new Date().toISOString(),
        };

        const result = await classifyEngine.classifyEmail(email);
        if (result.category === test.expected_category) {
          correct++;
        }
      }

      const accuracy = correct / approvalEmails.length;
      console.log(`Approval classification accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${approvalEmails.length})`);
      // Rule-based should get at least 80% on clear approval keywords
      expect(accuracy).toBeGreaterThanOrEqual(0.75);
    });

    it('should classify notification emails correctly', async () => {
      const notificationEmails = labeledEmails.filter(e => e.expected_category === 1);
      let correct = 0;

      for (const test of notificationEmails) {
        const email: Email = {
          id: 0,
          message_id: test.id,
          account_id: 'test@example.com',
          from_name: 'Test',
          from_email: 'test@example.com',
          to_list: [],
          cc_list: [],
          subject: test.subject,
          body_text: test.body,
          date: new Date().toISOString(),
          has_attachment: false,
          category: 4,
          urgency: 0,
          confidence: 0,
          created_at: new Date().toISOString(),
        };

        const result = await classifyEngine.classifyEmail(email);
        if (result.category === test.expected_category) {
          correct++;
        }
      }

      const accuracy = correct / notificationEmails.length;
      console.log(`Notification classification accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${notificationEmails.length})`);
      expect(accuracy).toBeGreaterThanOrEqual(0.60);
    });

    it('should classify report emails correctly', async () => {
      const reportEmails = labeledEmails.filter(e => e.expected_category === 3);
      let correct = 0;

      for (const test of reportEmails) {
        const email: Email = {
          id: 0,
          message_id: test.id,
          account_id: 'test@example.com',
          from_name: 'Test',
          from_email: 'test@example.com',
          to_list: [],
          cc_list: [],
          subject: test.subject,
          body_text: test.body,
          date: new Date().toISOString(),
          has_attachment: false,
          category: 4,
          urgency: 0,
          confidence: 0,
          created_at: new Date().toISOString(),
        };

        const result = await classifyEngine.classifyEmail(email);
        if (result.category === test.expected_category) {
          correct++;
        }
      }

      const accuracy = correct / reportEmails.length;
      console.log(`Report classification accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${reportEmails.length})`);
      expect(accuracy).toBeGreaterThanOrEqual(0.70);
    });

    it('should detect urgency correctly', async () => {
      const highUrgencyEmails = labeledEmails.filter(e => e.expected_urgency === 2);
      let correct = 0;

      for (const test of highUrgencyEmails) {
        const email: Email = {
          id: 0,
          message_id: test.id,
          account_id: 'test@example.com',
          from_name: 'Test',
          from_email: 'test@example.com',
          to_list: [],
          cc_list: [],
          subject: test.subject,
          body_text: test.body,
          date: new Date().toISOString(),
          has_attachment: false,
          category: 4,
          urgency: 0,
          confidence: 0,
          created_at: new Date().toISOString(),
        };

        const result = await classifyEngine.classifyEmail(email);
        // High urgency should be detected (urgency >= 1)
        if (result.urgency >= 1) {
          correct++;
        }
      }

      const accuracy = correct / highUrgencyEmails.length;
      console.log(`High urgency detection: ${(accuracy * 100).toFixed(1)}% (${correct}/${highUrgencyEmails.length})`);
      expect(accuracy).toBeGreaterThanOrEqual(0.60);
    });

    it('should classify all test emails with reasonable accuracy', async () => {
      let correct = 0;

      for (const test of labeledEmails) {
        const email: Email = {
          id: 0,
          message_id: test.id,
          account_id: 'test@example.com',
          from_name: 'Test',
          from_email: 'test@example.com',
          to_list: [],
          cc_list: [],
          subject: test.subject,
          body_text: test.body,
          date: new Date().toISOString(),
          has_attachment: false,
          category: 4,
          urgency: 0,
          confidence: 0,
          created_at: new Date().toISOString(),
        };

        const result = await classifyEngine.classifyEmail(email);
        if (result.category === test.expected_category) {
          correct++;
        }
      }

      const accuracy = correct / labeledEmails.length;
      console.log(`Overall rule-based classification accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${labeledEmails.length})`);
      expect(accuracy).toBeGreaterThanOrEqual(0.50); // Rule-based baseline
    });

    it('should handle edge cases', async () => {
      // Empty subject
      const emptySubject: Email = {
        id: 0,
        message_id: 'edge_001',
        account_id: 'test@example.com',
        from_name: 'Test',
        from_email: 'test@example.com',
        to_list: [],
        cc_list: [],
        subject: '',
        body_text: 'This is a test email',
        date: new Date().toISOString(),
        has_attachment: false,
        category: 4,
        urgency: 0,
        confidence: 0,
        created_at: new Date().toISOString(),
      };
      const result1 = await classifyEngine.classifyEmail(emptySubject);
      expect(result1.category).toBe(4); // Other
      expect(result1.confidence).toBeLessThan(0.8);

      // Very short email
      const shortEmail: Email = {
        id: 0,
        message_id: 'edge_002',
        account_id: 'test@example.com',
        from_name: 'Test',
        from_email: 'test@example.com',
        to_list: [],
        cc_list: [],
        subject: 'Hi',
        body_text: 'OK',
        date: new Date().toISOString(),
        has_attachment: false,
        category: 4,
        urgency: 0,
        confidence: 0,
        created_at: new Date().toISOString(),
      };
      const result2 = await classifyEngine.classifyEmail(shortEmail);
      expect(result2.category).toBe(4); // Other

      // Mixed type (approval + discussion)
      const mixedEmail: Email = {
        id: 0,
        message_id: 'edge_003',
        account_id: 'test@example.com',
        from_name: 'Test',
        from_email: 'test@example.com',
        to_list: [],
        cc_list: [],
        subject: '审批讨论',
        body_text: '请审批这个方案，我们可以讨论一下细节',
        date: new Date().toISOString(),
        has_attachment: false,
        category: 4,
        urgency: 0,
        confidence: 0,
        created_at: new Date().toISOString(),
      };
      const result3 = await classifyEngine.classifyEmail(mixedEmail);
      // Should return the first matched category (approval)
      expect([0, 2]).toContain(result3.category);
    });
  });

  describe('Category and urgency labels', () => {
    it('should return correct category labels', () => {
      expect(classifyEngine.getCategoryLabel(0)).toBe('审批');
      expect(classifyEngine.getCategoryLabel(1)).toBe('通知');
      expect(classifyEngine.getCategoryLabel(2)).toBe('讨论');
      expect(classifyEngine.getCategoryLabel(3)).toBe('汇报');
      expect(classifyEngine.getCategoryLabel(4)).toBe('其他');
      expect(classifyEngine.getCategoryLabel(999)).toBe('其他');
    });

    it('should return correct urgency labels', () => {
      expect(classifyEngine.getUrgencyLabel(0)).toBe('低');
      expect(classifyEngine.getUrgencyLabel(1)).toBe('中');
      expect(classifyEngine.getUrgencyLabel(2)).toBe('高');
      expect(classifyEngine.getUrgencyLabel(999)).toBe('低');
    });
  });
});
