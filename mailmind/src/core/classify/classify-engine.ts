import { emailRepo } from '../../db/repositories';
import { invoke } from '@tauri-apps/api/core';
import type { Email } from '../../types';

export interface ClassificationResult {
  category: number;
  urgency: number;
  confidence: number;
}

class ClassifyEngine {
  private isReady = false;

  async initialize(): Promise<void> {
    // Check if model is available
    try {
      await invoke('load_classifier_model');
      this.isReady = true;
    } catch {
      console.warn('Classifier model not available, using rule-based fallback');
      this.isReady = false;
    }
  }

  async classifyEmail(email: Email): Promise<ClassificationResult> {
    const text = `${email.subject} ${email.body_text}`.toLowerCase();

    // Try model-based classification first
    if (this.isReady) {
      try {
        const result = await invoke<ClassificationResult>('classify_email', {
          subject: email.subject,
          body: email.body_text,
        });
        return result;
      } catch {
        // Fall back to rule-based
      }
    }

    // Rule-based fallback
    return this.ruleBasedClassify(text);
  }

  async classifyAndSave(email: Email): Promise<Email> {
    const classification = await this.classifyEmail(email);

    // Update email with classification
    const updated = await emailRepo.create({
      ...email,
      category: classification.category,
      urgency: classification.urgency,
      confidence: classification.confidence,
    });

    return updated;
  }

  async batchClassify(emails: Email[]): Promise<Email[]> {
    const results: Email[] = [];

    for (const email of emails) {
      const classified = await this.classifyAndSave(email);
      results.push(classified);
    }

    return results;
  }

  private ruleBasedClassify(text: string): ClassificationResult {
    let category = 4; // Other
    let confidence = 0.75;

    // Classification rules
    if (text.includes('审批') || text.includes('批复') || text.includes('审核') || text.includes('批准')) {
      category = 0; // Approval
      confidence = 0.92;
    } else if (text.includes('通知') || text.includes('公告') || text.includes('温馨提醒')) {
      category = 1; // Notification
      confidence = 0.88;
    } else if (text.includes('re:') || text.includes('回复') || text.includes('讨论') || text.includes('fw:')) {
      category = 2; // Discussion
      confidence = 0.85;
    } else if (text.includes('汇报') || text.includes('报告') || text.includes('总结') || text.includes('周报')) {
      category = 3; // Report
      confidence = 0.87;
    }

    // Urgency detection
    let urgency = 0; // Low
    if (text.includes('紧急') || text.includes('urgent') || text.includes('asap') || text.includes('截止')) {
      urgency = 2; // High
    } else if (text.includes('重要') || text.includes('important') || text.includes('请尽快')) {
      urgency = 1; // Medium
    }

    return { category, urgency, confidence };
  }

  getCategoryLabel(category: number): string {
    const labels: Record<number, string> = {
      0: '审批',
      1: '通知',
      2: '讨论',
      3: '汇报',
      4: '其他',
    };
    return labels[category] || '其他';
  }

  getUrgencyLabel(urgency: number): string {
    const labels: Record<number, string> = {
      0: '低',
      1: '中',
      2: '高',
    };
    return labels[urgency] || '低';
  }
}

export const classifyEngine = new ClassifyEngine();
