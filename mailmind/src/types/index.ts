export interface Email {
  id: number;
  message_id: string;
  thread_id: string | null;
  account_id: string;
  from_name: string;
  from_email: string;
  to_list: string[];
  cc_list: string[];
  subject: string;
  body_text: string;
  date: Date;
  has_attachment: boolean;
  category: number; // 0=审批, 1=通知, 2=讨论, 3=汇报, 4=其他
  urgency: number; // 0=低, 1=中, 2=高
  confidence: number;
  created_at: Date;
}

export interface EmailEmbedding {
  id: number;
  email_id: number;
  embedding: number[]; // 768维向量
}

export interface Entity {
  id: number;
  email_id: number;
  entity_type: 'person' | 'company' | 'project' | 'amount' | 'date';
  entity_value: string;
  confidence: number;
}

export interface Recommendation {
  id: number;
  user_id: string;
  scene_type: 'approval' | 'weekly_report' | 'todo';
  trigger_condition: string;
  score: number;
  status: 'shown' | 'clicked' | 'dismissed';
  created_at: Date;
}

export type Category = 'approval' | 'notification' | 'discussion' | 'report' | 'other';
export type Urgency = 'low' | 'medium' | 'high';
