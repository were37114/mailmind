import { getDb } from '../pglite-client';
import type { Recommendation } from '../../types';

export class RecommendationRepository {
  async create(rec: Omit<Recommendation, 'id' | 'created_at'>): Promise<Recommendation> {
    const db = await getDb();
    const result = await db.query(
      `INSERT INTO recommendations (user_id, scene_type, trigger_condition, score, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [rec.user_id, rec.scene_type, rec.trigger_condition, rec.score, rec.status]
    );

    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findByUser(userId: string, limit: number = 10): Promise<Recommendation[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM recommendations WHERE user_id = $1 ORDER BY score DESC LIMIT $2',
      [userId, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async findActive(userId: string): Promise<Recommendation[]> {
    const db = await getDb();
    const result = await db.query(
      `SELECT * FROM recommendations 
       WHERE user_id = $1 AND status = 'shown'
       ORDER BY score DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async updateStatus(id: number, status: Recommendation['status']): Promise<void> {
    const db = await getDb();
    await db.query('UPDATE recommendations SET status = $1 WHERE id = $2', [status, id]);
  }

  async deleteOld(days: number = 30): Promise<void> {
    const db = await getDb();
    await db.query(
      "DELETE FROM recommendations WHERE created_at < NOW() - INTERVAL '$1 days'",
      [days]
    );
  }

  private mapRow(row: Record<string, unknown>): Recommendation {
    return {
      id: Number(row.id),
      user_id: String(row.user_id),
      scene_type: String(row.scene_type) as Recommendation['scene_type'],
      trigger_condition: String(row.trigger_condition),
      score: Number(row.score),
      status: String(row.status) as Recommendation['status'],
      created_at: new Date(String(row.created_at)),
    };
  }
}

export const recommendationRepo = new RecommendationRepository();
