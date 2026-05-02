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

    // Classification rules — expanded keyword coverage
    const approvalKw = ['审批', '批复', '审核', '批准', '请审批', '请审核', '核准', '同意', '申请', '报批', '签批', '签核', '额度提升', '续签', '签署', '合同', '变更', '退回', '催办'];
    const notifyKw = ['通知', '公告', '温馨提醒', '提醒', '维护', '更新', '活动', '放假', '安排', '安全提醒', '登录提醒'];
    const discussKw = ['re:', '回复', '讨论', 'fw:', '转发', '确认', '疑问', '意见', '建议', '帮忙', '帮忙看'];
    const reportKw = ['汇报', '报告', '总结', '周报', '月报', '进展', '进度', '权益报告'];

    const approvalHits = approvalKw.filter(k => text.includes(k)).length;
    const notifyHits = notifyKw.filter(k => text.includes(k)).length;
    const discussHits = discussKw.filter(k => text.includes(k)).length;
    const reportHits = reportKw.filter(k => text.includes(k)).length;

    const maxHits = Math.max(approvalHits, notifyHits, discussHits, reportHits);
    if (maxHits === 0) {
      category = 4;
      confidence = 0.3;
    } else if (approvalHits === maxHits) {
      category = 0; confidence = Math.min(0.5 + approvalHits * 0.12, 0.98);
    } else if (notifyHits === maxHits) {
      category = 1; confidence = Math.min(0.5 + notifyHits * 0.12, 0.98);
    } else if (discussHits === maxHits) {
      category = 2; confidence = Math.min(0.5 + discussHits * 0.12, 0.98);
    } else if (reportHits === maxHits) {
      category = 3; confidence = Math.min(0.5 + reportHits * 0.12, 0.98);
    }

    // Urgency detection
    let urgency = 0; // Low
    const highUrgencyKeywords = [
      '紧急', 'urgent', 'asap', '截止', '严重', '宕机', '故障', '报警', '告警',
      '回滚', '立即', '马上', '务必', '不能等', '刻不容缓', '火急', '危险',
      '异常', '瘫痪', '中断', '事故', '泄露', '攻击', '入侵', '批复', '续签',
      '到期', '上线', '扩容', '支付', '付款', '逾期', '超时',
    ];
    const mediumUrgencyKeywords = [
      '重要', 'important', '请尽快', '尽快', '请处理', '麻烦', '需要',
      '请确认', '注意', '提醒', '关注', '优先', '加急', '赶', '催',
      '请回复', '请审批', '请审核', '待办', '未完成',
    ];

    if (highUrgencyKeywords.some(k => text.includes(k))) {
      urgency = 2; // High
    } else if (mediumUrgencyKeywords.some(k => text.includes(k))) {
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
