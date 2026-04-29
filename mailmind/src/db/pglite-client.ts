import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

let db: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (!db) {
    db = await PGlite.create({
      dataDir: 'idb://mailmind-db',
      extensions: {
        vector,
      },
    });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

export async function initSchema(): Promise<void> {
  const database = await getDb();

  // Enable pgvector
  await database.exec('CREATE EXTENSION IF NOT EXISTS vector;');

  // Create tables
  await database.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      message_id TEXT UNIQUE NOT NULL,
      thread_id TEXT,
      account_id TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT '',
      from_email TEXT NOT NULL,
      to_list JSONB NOT NULL DEFAULT '[]',
      cc_list JSONB NOT NULL DEFAULT '[]',
      subject TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      date TIMESTAMP NOT NULL,
      has_attachment BOOLEAN NOT NULL DEFAULT FALSE,
      category INTEGER NOT NULL DEFAULT 4,
      urgency INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_embeddings (
      id SERIAL PRIMARY KEY,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      embedding VECTOR(768) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entities (
      id SERIAL PRIMARY KEY,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'company', 'project', 'amount', 'date')),
      entity_value TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      scene_type TEXT NOT NULL CHECK (scene_type IN ('approval', 'weekly_report', 'todo')),
      trigger_condition TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN ('shown', 'clicked', 'dismissed')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
    CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
    CREATE INDEX IF NOT EXISTS idx_emails_urgency ON emails(urgency);
    CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date);
    CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(email_id);
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
  `);

  // Create HNSW vector index
  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_email_embeddings_vector 
    ON email_embeddings 
    USING hnsw (embedding vector_cosine_ops);
  `);
}

export async function resetDb(): Promise<void> {
  await closeDb();
  db = null;
}
