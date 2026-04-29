import { getDb } from '../pglite-client';
import type { EmbeddingResult } from '../../models/onnx-embedder';

export interface EmailEmbedding {
  id: number;
  emailId: number;
  embedding: number[];
}

export const embeddingRepo = {
  /**
   * Insert or update embedding for an email
   */
  async upsert(emailId: number, embedding: number[]): Promise<void> {
    const db = await getDb();
    const vectorStr = `[${embedding.join(',')}]`;

    await db.query(
      `INSERT INTO email_embeddings (email_id, embedding)
       VALUES ($1, $2::vector)
       ON CONFLICT (email_id) DO UPDATE
       SET embedding = EXCLUDED.embedding`,
      [emailId, vectorStr]
    );
  },

  /**
   * Find similar emails using cosine similarity (HNSW index)
   */
  async searchSimilar(
    queryEmbedding: number[],
    limit: number = 5,
    minSimilarity: number = 0.5
  ): Promise<Array<{ emailId: number; similarity: number }>> {
    const db = await getDb();
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // HNSW index automatically optimizes this query
    const result = await db.query(
      `SELECT email_id, 1 - (embedding <=> $1::vector) as similarity
       FROM email_embeddings
       WHERE 1 - (embedding <=> $1::vector) >= $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, minSimilarity, limit]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      emailId: row.email_id as number,
      similarity: row.similarity as number,
    }));
  },

  /**
   * Find similar emails with full email data joined
   */
  async searchSimilarWithEmails(
    queryEmbedding: number[],
    limit: number = 5,
    minSimilarity: number = 0.5
  ): Promise<Array<Record<string, unknown> & { similarity: number }>> {
    const db = await getDb();
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const result = await db.query(
      `SELECT e.*, 1 - (em.embedding <=> $1::vector) as similarity
       FROM email_embeddings em
       JOIN emails e ON em.email_id = e.id
       WHERE 1 - (em.embedding <=> $1::vector) >= $2
       ORDER BY em.embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, minSimilarity, limit]
    );

    return result.rows as Array<Record<string, unknown> & { similarity: number }>;
  },

  /**
   * Delete embedding for an email
   */
  async deleteByEmailId(emailId: number): Promise<void> {
    const db = await getDb();
    await db.query('DELETE FROM email_embeddings WHERE email_id = $1', [emailId]);
  },

  /**
   * Get embedding by email ID
   */
  async getByEmailId(emailId: number): Promise<EmailEmbedding | null> {
    const db = await getDb();
    const result = await db.query(
      'SELECT id, email_id, embedding FROM email_embeddings WHERE email_id = $1',
      [emailId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: row.id as number,
      emailId: row.email_id as number,
      embedding: (row.embedding as string)
        .replace('[', '')
        .replace(']', '')
        .split(',')
        .map(Number),
    };
  },

  /**
   * Count total embeddings
   */
  async count(): Promise<number> {
    const db = await getDb();
    const result = await db.query('SELECT COUNT(*) as count FROM email_embeddings');
    return (result.rows[0] as Record<string, unknown>).count as number;
  },
};
