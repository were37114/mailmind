import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initSchema, resetDb } from '../../src/db/pglite-client';
import { emailRepo, entityRepo, recommendationRepo } from '../../src/db/repositories';

describe('Data Layer Integration Tests (U8)', () => {
  beforeAll(async () => {
    await initSchema();
  });

  afterAll(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    // Clean up before each test
    const db = await import('../../src/db/pglite-client').then(m => m.getDb());
    await db.query('DELETE FROM recommendations');
    await db.query('DELETE FROM entities');
    await db.query('DELETE FROM email_embeddings');
    await db.query('DELETE FROM emails');
  });

  describe('EmailRepository', () => {
    it('should create and retrieve an email', async () => {
      const email = await emailRepo.create({
        message_id: 'test-msg-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Test Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Test Subject',
        body_text: 'Test body content',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 1,
        confidence: 0.95,
      });

      expect(email.id).toBeDefined();
      expect(email.message_id).toBe('test-msg-001');

      const retrieved = await emailRepo.findById(email.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.subject).toBe('Test Subject');
      expect(retrieved?.from_email).toBe('sender@example.com');
    });

    it('should upsert on duplicate message_id', async () => {
      const email1 = await emailRepo.create({
        message_id: 'dup-msg-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Original Subject',
        body_text: 'Original body',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 1,
        confidence: 0.8,
      });

      const email2 = await emailRepo.create({
        message_id: 'dup-msg-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Updated Subject',
        body_text: 'Updated body',
        date: new Date('2024-01-15T10:00:00Z'),
        has_attachment: true,
        category: 1,
        urgency: 2,
        confidence: 0.95,
      });

      expect(email1.id).toBe(email2.id);
      expect(email2.subject).toBe('Updated Subject');
      expect(email2.has_attachment).toBe(true);

      const count = await emailRepo.count();
      expect(count).toBe(1);
    });

    it('should search emails by text', async () => {
      await emailRepo.create({
        message_id: 'search-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Finance',
        from_email: 'finance@example.com',
        to_list: ['boss@example.com'],
        cc_list: [],
        subject: 'Budget approval request',
        body_text: 'Please approve the Q1 budget of 500k',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 2,
        confidence: 0.9,
      });

      const results = await emailRepo.searchByText('budget approval');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].subject).toContain('Budget');
    });

    it('should prevent SQL injection in search', async () => {
      // This should not throw or delete data
      const results = await emailRepo.searchByText("'; DROP TABLE emails; --");
      expect(results).toEqual([]);

      // Verify table still exists by counting
      const count = await emailRepo.count();
      expect(count).toBe(0); // Should be 0 because we cleaned up, not because table was dropped
    });

    it('should find emails by category', async () => {
      await emailRepo.create({
        message_id: 'cat-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Approval needed',
        body_text: 'Please approve',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0, // approval
        urgency: 2,
        confidence: 0.9,
      });

      await emailRepo.create({
        message_id: 'cat-002',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Meeting notice',
        body_text: 'Meeting at 2pm',
        date: new Date('2024-01-15T10:00:00Z'),
        has_attachment: false,
        category: 1, // notification
        urgency: 0,
        confidence: 0.8,
      });

      const approvals = await emailRepo.findByCategory(0);
      expect(approvals.length).toBe(1);
      expect(approvals[0].subject).toBe('Approval needed');

      const notifications = await emailRepo.findByCategory(1);
      expect(notifications.length).toBe(1);
      expect(notifications[0].subject).toBe('Meeting notice');
    });

    it('should update category and urgency', async () => {
      const email = await emailRepo.create({
        message_id: 'update-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Test',
        body_text: 'Test body',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 4,
        urgency: 0,
        confidence: 0.5,
      });

      await emailRepo.updateCategory(email.id, 0, 0.95);
      await emailRepo.updateUrgency(email.id, 2);

      const updated = await emailRepo.findById(email.id);
      expect(updated?.category).toBe(0);
      expect(updated?.urgency).toBe(2);
      expect(updated?.confidence).toBe(0.95);
    });

    it('should count emails by category', async () => {
      await emailRepo.create({
        message_id: 'count-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Approval 1',
        body_text: 'Body',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 2,
        confidence: 0.9,
      });

      await emailRepo.create({
        message_id: 'count-002',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Approval 2',
        body_text: 'Body',
        date: new Date('2024-01-15T10:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 1,
        confidence: 0.9,
      });

      await emailRepo.create({
        message_id: 'count-003',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Notice',
        body_text: 'Body',
        date: new Date('2024-01-15T11:00:00Z'),
        has_attachment: false,
        category: 1,
        urgency: 0,
        confidence: 0.8,
      });

      const counts = await emailRepo.countByCategory();
      expect(counts[0]).toBe(2);
      expect(counts[1]).toBe(1);
    });
  });

  describe('EntityRepository', () => {
    it('should create and retrieve entities', async () => {
      // First create an email
      const email = await emailRepo.create({
        message_id: 'entity-email-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Test',
        body_text: 'Test body',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 2,
        confidence: 0.9,
      });

      const entity = await entityRepo.create({
        email_id: email.id,
        entity_type: 'amount',
        entity_value: '500000',
        confidence: 0.95,
      });

      expect(entity.id).toBeDefined();

      const entities = await entityRepo.findByEmailId(email.id);
      expect(entities.length).toBe(1);
      expect(entities[0].entity_value).toBe('500000');
    });

    it('should find entities by type', async () => {
      const email = await emailRepo.create({
        message_id: 'entity-type-001',
        thread_id: null,
        account_id: 'test@example.com',
        from_name: 'Sender',
        from_email: 'sender@example.com',
        to_list: ['recipient@example.com'],
        cc_list: [],
        subject: 'Test',
        body_text: 'Test body',
        date: new Date('2024-01-15T09:00:00Z'),
        has_attachment: false,
        category: 0,
        urgency: 2,
        confidence: 0.9,
      });

      await entityRepo.create({
        email_id: email.id,
        entity_type: 'person',
        entity_value: '张三',
        confidence: 0.9,
      });

      await entityRepo.create({
        email_id: email.id,
        entity_type: 'amount',
        entity_value: '1000000',
        confidence: 0.95,
      });

      const persons = await entityRepo.findByType('person');
      expect(persons.length).toBe(1);
      expect(persons[0].entity_value).toBe('张三');

      const amounts = await entityRepo.findByType('amount');
      expect(amounts.length).toBe(1);
      expect(amounts[0].entity_value).toBe('1000000');
    });
  });

  describe('RecommendationRepository', () => {
    it('should create and retrieve recommendations', async () => {
      const rec = await recommendationRepo.create({
        user_id: 'user-001',
        scene_type: 'approval',
        trigger_condition: 'pending_approvals >= 3',
        score: 0.95,
        status: 'shown',
      });

      expect(rec.id).toBeDefined();

      const recs = await recommendationRepo.findByUser('user-001');
      expect(recs.length).toBe(1);
      expect(recs[0].scene_type).toBe('approval');
    });

    it('should update recommendation status', async () => {
      const rec = await recommendationRepo.create({
        user_id: 'user-002',
        scene_type: 'weekly_report',
        trigger_condition: 'friday_4pm',
        score: 0.88,
        status: 'shown',
      });

      await recommendationRepo.updateStatus(rec.id, 'clicked');

      const active = await recommendationRepo.findActive('user-002');
      expect(active.length).toBe(0); // clicked is not 'shown'
    });
  });

  describe('Transaction-like operations', () => {
    it('should handle bulk email creation', async () => {
      const emails = [];
      for (let i = 0; i < 10; i++) {
        emails.push({
          message_id: `bulk-${i}`,
          thread_id: null,
          account_id: 'test@example.com',
          from_name: 'Sender',
          from_email: 'sender@example.com',
          to_list: ['recipient@example.com'],
          cc_list: [],
          subject: `Bulk email ${i}`,
          body_text: 'Bulk body',
          date: new Date(`2024-01-15T0${i}:00:00Z`),
          has_attachment: false,
          category: i % 5,
          urgency: i % 3,
          confidence: 0.8,
        });
      }

      for (const email of emails) {
        await emailRepo.create(email);
      }

      const count = await emailRepo.count();
      expect(count).toBe(10);
    });
  });
});
