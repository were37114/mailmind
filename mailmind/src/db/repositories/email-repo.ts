import { getDb } from '../pglite-client';
import type { Email } from '../../types';

export class EmailRepository {
  async create(email: Omit<Email, 'id' | 'created_at'>): Promise<Email> {
    const db = await getDb();
    const result = await db.query(
      `INSERT INTO emails (message_id, thread_id, account_id, from_name, from_email, to_list, cc_list, subject, body_text, date, has_attachment, category, urgency, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (message_id) DO UPDATE SET
         thread_id = EXCLUDED.thread_id,
         from_name = EXCLUDED.from_name,
         from_email = EXCLUDED.from_email,
         to_list = EXCLUDED.to_list,
         cc_list = EXCLUDED.cc_list,
         subject = EXCLUDED.subject,
         body_text = EXCLUDED.body_text,
         date = EXCLUDED.date,
         has_attachment = EXCLUDED.has_attachment,
         category = EXCLUDED.category,
         urgency = EXCLUDED.urgency,
         confidence = EXCLUDED.confidence
       RETURNING *`,
      [
        email.message_id,
        email.thread_id,
        email.account_id,
        email.from_name,
        email.from_email,
        JSON.stringify(email.to_list),
        JSON.stringify(email.cc_list),
        email.subject,
        email.body_text,
        email.date.toISOString(),
        email.has_attachment,
        email.category,
        email.urgency,
        email.confidence,
      ]
    );

    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findById(id: number): Promise<Email | null> {
    const db = await getDb();
    const result = await db.query('SELECT * FROM emails WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findByMessageId(messageId: string): Promise<Email | null> {
    const db = await getDb();
    const result = await db.query('SELECT * FROM emails WHERE message_id = $1', [messageId]);

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findByAccount(accountId: string, limit: number = 100): Promise<Email[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM emails WHERE account_id = $1 ORDER BY date DESC LIMIT $2',
      [accountId, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async findByCategory(category: number, limit: number = 100): Promise<Email[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM emails WHERE category = $1 ORDER BY date DESC LIMIT $2',
      [category, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async findByUrgency(urgency: number, limit: number = 100): Promise<Email[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM emails WHERE urgency = $1 ORDER BY date DESC LIMIT $2',
      [urgency, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async findPendingApprovals(): Promise<Email[]> {
    const db = await getDb();
    const result = await db.query(
      `SELECT * FROM emails 
       WHERE category = 0 
       AND date > NOW() - INTERVAL '30 days'
       ORDER BY urgency DESC, date DESC`
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async searchByText(query: string, limit: number = 50): Promise<Email[]> {
    const db = await getDb();
    // Use parameterized LIKE query to prevent SQL injection
    // Note: Full-text search with 'chinese' config not available in PGLite by default
    const searchPattern = `%${query}%`;
    const result = await db.query(
      `SELECT * FROM emails 
       WHERE subject ILIKE $1 OR body_text ILIKE $1
       ORDER BY date DESC 
       LIMIT $2`,
      [searchPattern, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async updateCategory(id: number, category: number, confidence: number): Promise<void> {
    const db = await getDb();
    await db.query(
      'UPDATE emails SET category = $1, confidence = $2 WHERE id = $3',
      [category, confidence, id]
    );
  }

  async updateUrgency(id: number, urgency: number): Promise<void> {
    const db = await getDb();
    await db.query('UPDATE emails SET urgency = $1 WHERE id = $2', [urgency, id]);
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.query('DELETE FROM emails WHERE id = $1', [id]);
  }

  async count(): Promise<number> {
    const db = await getDb();
    const result = await db.query('SELECT COUNT(*) as count FROM emails');
    return Number((result.rows[0] as Record<string, unknown>).count);
  }

  async countByCategory(): Promise<Record<number, number>> {
    const db = await getDb();
    const result = await db.query(
      'SELECT category, COUNT(*) as count FROM emails GROUP BY category'
    );

    const counts: Record<number, number> = {};
    for (const row of result.rows) {
      const r = row as Record<string, unknown>;
      counts[Number(r.category)] = Number(r.count);
    }
    return counts;
  }

  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      // Handle PostgreSQL array format: {item1,item2} or JSON ["item1","item2"]
      const str = value.trim();
      if (str.startsWith('{') && str.endsWith('}')) {
        // PostgreSQL array format
        const content = str.slice(1, -1);
        if (content === '') return [];
        return content.split(',').map(s => s.trim());
      }
      try {
        return JSON.parse(str) as string[];
      } catch {
        return str ? [str] : [];
      }
    }
    return [];
  }

  private mapRow(row: Record<string, unknown>): Email {
    return {
      id: Number(row.id),
      message_id: String(row.message_id),
      thread_id: row.thread_id ? String(row.thread_id) : null,
      account_id: String(row.account_id),
      from_name: String(row.from_name),
      from_email: String(row.from_email),
      to_list: this.parseStringArray(row.to_list),
      cc_list: this.parseStringArray(row.cc_list),
      subject: String(row.subject),
      body_text: String(row.body_text),
      date: new Date(String(row.date)),
      has_attachment: Boolean(row.has_attachment),
      category: Number(row.category),
      urgency: Number(row.urgency),
      confidence: Number(row.confidence),
      created_at: new Date(String(row.created_at)),
    };
  }
}

export const emailRepo = new EmailRepository();
