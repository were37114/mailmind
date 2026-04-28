import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, initSchema, closeDb } from '../src/db/pglite-client';

// Helper to generate random email data
function generateMockEmails(count: number) {
  const categories = [0, 1, 2, 3, 4];
  const urgencies = [0, 1, 2];

  return Array.from({ length: count }, (_, i) => ({
    message_id: `msg_${i}_${Date.now()}`,
    account_id: 'test@example.com',
    from_name: `Sender ${i % 100}`,
    from_email: `sender${i % 100}@company.com`,
    to_list: JSON.stringify([`recipient@company.com`]),
    cc_list: JSON.stringify([]),
    subject: `Test email subject ${i} about ${['budget', 'meeting', 'report', 'approval', 'notification'][i % 5]}`,
    body_text: `This is the body of email ${i}. It contains some content about ${['project planning', 'financial review', 'team updates', 'client feedback', 'weekly status'][i % 5]}.`,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    has_attachment: Math.random() > 0.7,
    category: categories[i % 5],
    urgency: urgencies[i % 3],
    confidence: 0.7 + Math.random() * 0.3,
  }));
}

// Helper to generate random embedding
function generateEmbedding(): number[] {
  return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
}

describe('PGLite + pgvector Performance Tests', () => {
  beforeAll(async () => {
    await initSchema();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should initialize PGLite with pgvector extension', async () => {
    const db = await getDb();
    const result = await db.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as Record<string, unknown>).extname).toBe('vector');
  });

  it('should create all required tables', async () => {
    const db = await getDb();
    const tables = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('emails', 'email_embeddings', 'entities', 'recommendations')
    `);
    expect(tables.rows.length).toBeGreaterThanOrEqual(4);
  });

  it('should insert 1000 emails in under 10 seconds', async () => {
    const db = await getDb();
    const emails = generateMockEmails(1000);

    const start = performance.now();

    for (const email of emails) {
      await db.query(
        `INSERT INTO emails (message_id, account_id, from_name, from_email, to_list, cc_list, subject, body_text, date, has_attachment, category, urgency, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          email.message_id,
          email.account_id,
          email.from_name,
          email.from_email,
          email.to_list,
          email.cc_list,
          email.subject,
          email.body_text,
          email.date,
          email.has_attachment,
          email.category,
          email.urgency,
          email.confidence,
        ]
      );
    }

    const duration = performance.now() - start;
    console.log(`Inserted 1000 emails in ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(10000); // < 10 seconds
  });

  it('should query emails by category in under 100ms', async () => {
    const db = await getDb();

    const start = performance.now();
    const result = await db.query('SELECT * FROM emails WHERE category = 0 LIMIT 100');
    const duration = performance.now() - start;

    console.log(`Category query: ${result.rows.length} rows in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  it('should query emails by date range in under 100ms', async () => {
    const db = await getDb();

    const start = performance.now();
    const result = await db.query(
      "SELECT * FROM emails WHERE date > NOW() - INTERVAL '7 days' LIMIT 100"
    );
    const duration = performance.now() - start;

    console.log(`Date range query: ${result.rows.length} rows in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  it('should insert and search vectors with HNSW index', async () => {
    const db = await getDb();

    // Insert 100 embeddings
    const embeddings = Array.from({ length: 100 }, (_, i) => ({
      email_id: i + 1,
      embedding: generateEmbedding(),
    }));

    for (const emb of embeddings) {
      await db.query(
        'INSERT INTO email_embeddings (email_id, embedding) VALUES ($1, $2)',
        [emb.email_id, `[${emb.embedding.join(',')}]`]
      );
    }

    // Search similar vectors
    const queryVector = generateEmbedding();
    const start = performance.now();

    const result = await db.query(
      'SELECT email_id, embedding <=> $1 as distance FROM email_embeddings ORDER BY distance LIMIT 5',
      [`[${queryVector.join(',')}]`]
    );

    const duration = performance.now() - start;
    console.log(`Vector search: ${result.rows.length} results in ${duration.toFixed(2)}ms`);

    expect(result.rows.length).toBe(5);
    expect(duration).toBeLessThan(100); // < 100ms for top-5
  });

  it('should handle empty queries gracefully', async () => {
    const db = await getDb();

    const result = await db.query('SELECT * FROM emails WHERE id = -1');
    expect(result.rows).toEqual([]);
  });

  it('should prevent SQL injection via parameterized queries', async () => {
    const db = await getDb();

    const maliciousInput = "'; DROP TABLE emails; --";

    // This should not throw and should return empty results
    const result = await db.query('SELECT * FROM emails WHERE subject = $1', [maliciousInput]);
    expect(result.rows).toEqual([]);

    // Verify table still exists
    const tableCheck = await db.query("SELECT tablename FROM pg_tables WHERE tablename = 'emails'");
    expect(tableCheck.rows.length).toBeGreaterThanOrEqual(1);
  });
});
