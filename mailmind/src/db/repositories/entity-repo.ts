import { getDb } from '../pglite-client';
import type { Entity } from '../../types';

export class EntityRepository {
  async create(entity: Omit<Entity, 'id' | 'created_at'>): Promise<Entity> {
    const db = await getDb();
    const result = await db.query(
      `INSERT INTO entities (email_id, entity_type, entity_value, confidence)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [entity.email_id, entity.entity_type, entity.entity_value, entity.confidence]
    );

    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findByEmailId(emailId: number): Promise<Entity[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM entities WHERE email_id = $1 ORDER BY confidence DESC',
      [emailId]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async findByType(entityType: string, limit: number = 100): Promise<Entity[]> {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM entities WHERE entity_type = $1 ORDER BY confidence DESC LIMIT $2',
      [entityType, limit]
    );

    return result.rows.map(row => this.mapRow(row as Record<string, unknown>));
  }

  async deleteByEmailId(emailId: number): Promise<void> {
    const db = await getDb();
    await db.query('DELETE FROM entities WHERE email_id = $1', [emailId]);
  }

  private mapRow(row: Record<string, unknown>): Entity {
    return {
      id: Number(row.id),
      email_id: Number(row.email_id),
      entity_type: String(row.entity_type) as Entity['entity_type'],
      entity_value: String(row.entity_value),
      confidence: Number(row.confidence),
      created_at: new Date(String(row.created_at)),
    };
  }
}

export const entityRepo = new EntityRepository();
