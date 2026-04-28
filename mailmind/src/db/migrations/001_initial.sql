-- 001_initial.sql
-- MailMind MVP 初始数据库Schema

-- 启用pgvector扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 邮件主表
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
  category INTEGER NOT NULL DEFAULT 4, -- 0=审批, 1=通知, 2=讨论, 3=汇报, 4=其他
  urgency INTEGER NOT NULL DEFAULT 0, -- 0=低, 1=中, 2=高
  confidence REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 邮件向量索引表
CREATE TABLE IF NOT EXISTS email_embeddings (
  id SERIAL PRIMARY KEY,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  embedding VECTOR(768) NOT NULL
);

-- 实体表
CREATE TABLE IF NOT EXISTS entities (
  id SERIAL PRIMARY KEY,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'company', 'project', 'amount', 'date')),
  entity_value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 推荐记录表
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  scene_type TEXT NOT NULL CHECK (scene_type IN ('approval', 'weekly_report', 'todo')),
  trigger_condition TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN ('shown', 'clicked', 'dismissed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
CREATE INDEX IF NOT EXISTS idx_emails_urgency ON emails(urgency);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date);
CREATE INDEX IF NOT EXISTS idx_entities_email ON entities(email_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

-- 创建HNSW向量索引
CREATE INDEX IF NOT EXISTS idx_email_embeddings_vector 
ON email_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails 
USING gin(to_tsvector('chinese', subject || ' ' || body_text));
