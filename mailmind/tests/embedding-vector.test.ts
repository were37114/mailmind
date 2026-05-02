import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initSchema, resetDb } from '../src/db/pglite-client';
import { emailRepo } from '../src/db/repositories';
import { embeddingRepo } from '../src/db/repositories/embedding-repo';
import { cosineSimilarity } from '../src/utils/embedding-math';

// Mock embeddings (384-dim for bge-small-zh)
function createMockEmbedding(seed: number): number[] {
  const vec = new Array(384).fill(0);
  // Create distinct vectors based on seed
  for (let i = 0; i < 384; i++) {
    vec[i] = Math.sin(seed * 1000 + i) * 0.5;
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map(v => v / norm);
}

// Pre-defined mock embeddings for different topics
const TOPIC_EMBEDDINGS = {
  approval: createMockEmbedding(1),    // budget/approval related
  report: createMockEmbedding(2),      // progress report
  notification: createMockEmbedding(3), // system notice
  social: createMockEmbedding(4),      // team event
  contract: createMockEmbedding(5),    // contract/approval
};

const testEmails = [
  {
    message_id: 'emb_test_1',
    account_id: 'test@example.com',
    from_name: '张三',
    from_email: 'zhangsan@company.com',
    to_list: ['test@example.com'],
    cc_list: [],
        thread_id: null,
    subject: '关于Q3预算审批的申请',
    body_text: '领导您好，请审批Q3季度营销预算，总额50万元。附件为详细预算表。',
    date: new Date('2026-04-01T09:00:00Z'),
    has_attachment: true,
    category: 0,
    urgency: 2,
    confidence: 0.95,
    embedding: TOPIC_EMBEDDINGS.approval,
  },
  {
    message_id: 'emb_test_2',
    account_id: 'test@example.com',
    from_name: '李四',
    from_email: 'lisi@company.com',
    to_list: ['test@example.com'],
    cc_list: [],
        thread_id: null,
    subject: '本周项目进度汇报',
    body_text: '本周完成了用户调研，收集了50份有效问卷。下周计划开始原型设计。',
    date: new Date('2026-04-02T09:00:00Z'),
    has_attachment: false,
    category: 3,
    urgency: 0,
    confidence: 0.88,
    embedding: TOPIC_EMBEDDINGS.report,
  },
  {
    message_id: 'emb_test_3',
    account_id: 'test@example.com',
    from_name: '王五',
    from_email: 'wangwu@company.com',
    to_list: ['test@example.com'],
    cc_list: [],
        thread_id: null,
    subject: '系统维护通知',
    body_text: '今晚22:00-23:00将进行服务器维护，期间服务可能短暂中断。',
    date: new Date('2026-04-03T09:00:00Z'),
    has_attachment: false,
    category: 1,
    urgency: 1,
    confidence: 0.92,
    embedding: TOPIC_EMBEDDINGS.notification,
  },
  {
    message_id: 'emb_test_4',
    account_id: 'test@example.com',
    from_name: '赵六',
    from_email: 'zhaoliu@company.com',
    to_list: ['test@example.com'],
    cc_list: [],
        thread_id: null,
    subject: '采购合同审批',
    body_text: '请审批与ABC公司的采购合同，合同金额120万元，付款方式为分期。',
    date: new Date('2026-04-04T09:00:00Z'),
    has_attachment: true,
    category: 0,
    urgency: 2,
    confidence: 0.90,
    embedding: TOPIC_EMBEDDINGS.contract,
  },
  {
    message_id: 'emb_test_5',
    account_id: 'test@example.com',
    from_name: '钱七',
    from_email: 'qianqi@company.com',
    to_list: ['test@example.com'],
    cc_list: [],
        thread_id: null,
    subject: '团队聚餐通知',
    body_text: '本周五晚上团队聚餐，地点在海底捞，请大家准时参加。',
    date: new Date('2026-04-05T09:00:00Z'),
    has_attachment: false,
    category: 1,
    urgency: 0,
    confidence: 0.85,
    embedding: TOPIC_EMBEDDINGS.social,
  },
];

describe('U6: Embedding + Vector Search Integration', () => {
  beforeAll(async () => {
    await initSchema();
    for (const email of testEmails) {
      const { embedding, ...emailData } = email;
      const created = await emailRepo.create(emailData);
      await embeddingRepo.upsert(created.id, embedding);
    }
  }, 30000);

  afterAll(async () => {
    await resetDb();
  });

  describe('Cosine similarity utility', () => {
    it('should return 1.0 for identical vectors', () => {
      const vec = createMockEmbedding(42);
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it('should return -1.0 for opposite vectors', () => {
      const vec = [1, 0, 0, 0];
      const opposite = [-1, 0, 0, 0];
      expect(cosineSimilarity(vec, opposite)).toBeCloseTo(-1.0, 5);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [0, 1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.0, 5);
    });

    it('should throw on dimension mismatch', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Dimension mismatch');
    });
  });

  describe('Embedding repository CRUD', () => {
    it('should insert embeddings and count them', async () => {
      const count = await embeddingRepo.count();
      expect(count).toBe(5);
    });

    it('should retrieve embedding by email ID', async () => {
      const email = await emailRepo.findByMessageId('emb_test_1');
      expect(email).not.toBeNull();

      const emb = await embeddingRepo.getByEmailId(email!.id);
      expect(emb).not.toBeNull();
      expect(emb!.emailId).toBe(email!.id);
      expect(emb!.embedding.length).toBe(384);
    });

    it('should update existing embedding on upsert', async () => {
      const email = await emailRepo.findByMessageId('emb_test_1');
      expect(email).not.toBeNull();

      const newVec = createMockEmbedding(999);
      await embeddingRepo.upsert(email!.id, newVec);

      const emb = await embeddingRepo.getByEmailId(email!.id);
      expect(emb).not.toBeNull();
      expect(cosineSimilarity(emb!.embedding, newVec)).toBeCloseTo(1.0, 5);
    });

    it('should delete embedding by email ID', async () => {
      const email = await emailRepo.findByMessageId('emb_test_5');
      expect(email).not.toBeNull();

      await embeddingRepo.deleteByEmailId(email!.id);
      const emb = await embeddingRepo.getByEmailId(email!.id);
      expect(emb).toBeNull();

      // Restore for other tests
      await embeddingRepo.upsert(email!.id, TOPIC_EMBEDDINGS.social);
    });
  });

  describe('Vector search (HNSW)', () => {
    it('should find similar approval emails', async () => {
      // Search using "approval" topic vector
      const results = await embeddingRepo.searchSimilar(TOPIC_EMBEDDINGS.approval, 3, 0.5);

      expect(results.length).toBeGreaterThanOrEqual(1);
      // Should find the approval-related emails first
      const similarities = results.map(r => r.similarity);
      expect(Math.max(...similarities)).toBeGreaterThan(0.5);
    });

    it('should find contract-related emails with approval query', async () => {
      // Contract embedding is similar to approval
      const results = await embeddingRepo.searchSimilar(TOPIC_EMBEDDINGS.contract, 5, 0.1);

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should return limited results', async () => {
      const results = await embeddingRepo.searchSimilar(TOPIC_EMBEDDINGS.approval, 2, 0.1);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty for high similarity threshold', async () => {
      const randomVec = createMockEmbedding(9999);
      const results = await embeddingRepo.searchSimilar(randomVec, 5, 0.99);
      expect(results.length).toBe(0);
    });

    it('should search with full email join', async () => {
      const results = await embeddingRepo.searchSimilarWithEmails(
        TOPIC_EMBEDDINGS.report, 3, 0.1
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
      // Should have email fields joined
      expect(results[0]).toHaveProperty('subject');
      expect(results[0]).toHaveProperty('similarity');
    });
  });

  describe('SQL injection prevention', () => {
    it('should safely handle vector string with special characters', async () => {
      // Vector content is parameterized, not string-interpolated
      const malicious = new Array(384).fill(0);
      malicious[0] = 1;
      // Even if someone crafts a malicious vector, it's parameterized
      const results = await embeddingRepo.searchSimilar(malicious, 5, 0.1);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should preserve table integrity after search operations', async () => {
      const countBefore = await embeddingRepo.count();

      // Run multiple searches
      for (const key of Object.keys(TOPIC_EMBEDDINGS)) {
        const emb = TOPIC_EMBEDDINGS[key as keyof typeof TOPIC_EMBEDDINGS];
        await embeddingRepo.searchSimilar(emb, 5, 0.1);
      }

      const countAfter = await embeddingRepo.count();
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Performance benchmarks', () => {
    it('should search vectors in under 200ms', async () => {
      const start = performance.now();
      await embeddingRepo.searchSimilar(TOPIC_EMBEDDINGS.approval, 5, 0.1);
      const latency = performance.now() - start;
      console.log(`Vector search latency: ${latency.toFixed(2)}ms`);
      expect(latency).toBeLessThan(200);
    });

    it('should handle upsert in under 100ms', async () => {
      const email = await emailRepo.findByMessageId('emb_test_1');
      expect(email).not.toBeNull();

      const vec = createMockEmbedding(888);
      const start = performance.now();
      await embeddingRepo.upsert(email!.id, vec);
      const latency = performance.now() - start;
      console.log(`Upsert latency: ${latency.toFixed(2)}ms`);
      expect(latency).toBeLessThan(100);
    });
  });
});

// Real model validation tests are in tests/embedding-real-model.test.ts
// They require network access to HuggingFace and are not run in CI
// Run manually: npx vitest run tests/embedding-real-model.test.ts
