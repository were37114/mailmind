import { emailRepo } from '../../db/repositories';
import type { Email } from '../../types';

export interface ApprovalItem {
  email: Email;
  confidence: number;
  amount?: string;
  deadline?: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'deferred';
}

export interface AuditLogEntry {
  emailId: number;
  action: 'viewed' | 'previewed' | 'approved' | 'rejected' | 'delegated' | 'deferred' | 'confirmed';
  timestamp: Date;
  operator: string;
  result?: string;
}

class ApprovalEngine {
  private auditLog: AuditLogEntry[] = [];

  // Layer 1: Rule-based recall (high recall, may have false positives)
  async findApprovalCandidates(): Promise<Email[]> {
    // Get all emails from last 30 days
    const allEmails = await emailRepo.findByCategory(0); // Category 0 = approval
    
    // Also search for emails with approval keywords but not yet classified
    const keywordEmails = await emailRepo.searchByText('审批');
    
    // Combine and deduplicate
    const combined = [...allEmails];
    for (const email of keywordEmails) {
      if (!combined.find(e => e.id === email.id)) {
        combined.push(email);
      }
    }
    
    return combined;
  }

  // Layer 2: 7B model precision filter
  async filterApprovals(candidates: Email[]): Promise<ApprovalItem[]> {
    const results: ApprovalItem[] = [];

    for (const email of candidates) {
      // Simulate 7B model analysis
      const analysis = this.analyzeApproval(email);
      
      if (analysis.isApproval) {
        results.push({
          email,
          confidence: analysis.confidence,
          amount: analysis.amount,
          deadline: analysis.deadline,
          status: 'pending',
        });
      }
    }

    // Sort by urgency and confidence
    return results.sort((a, b) => {
      if (a.email.urgency !== b.email.urgency) {
        return b.email.urgency - a.email.urgency;
      }
      return b.confidence - a.confidence;
    });
  }

  // Full pipeline: rule recall + model filter
  async getPendingApprovals(): Promise<ApprovalItem[]> {
    const candidates = await this.findApprovalCandidates();
    return this.filterApprovals(candidates);
  }

  // Actions
  async approve(item: ApprovalItem, operator: string): Promise<void> {
    this.logAction(item.email.id, 'approved', operator, 'Approved');
    item.status = 'approved';
  }

  async reject(item: ApprovalItem, operator: string, reason?: string): Promise<void> {
    this.logAction(item.email.id, 'rejected', operator, reason || 'Rejected');
    item.status = 'rejected';
  }

  async delegate(item: ApprovalItem, operator: string, delegateTo: string): Promise<void> {
    this.logAction(item.email.id, 'delegated', operator, `Delegated to ${delegateTo}`);
    item.status = 'delegated';
  }

  async defer(item: ApprovalItem, operator: string): Promise<void> {
    this.logAction(item.email.id, 'deferred', operator, 'Deferred');
    item.status = 'deferred';
  }

  // Audit log
  getAuditLog(emailId?: number): AuditLogEntry[] {
    if (emailId) {
      return this.auditLog.filter(entry => entry.emailId === emailId);
    }
    return [...this.auditLog];
  }

  private analyzeApproval(email: Email): {
    isApproval: boolean;
    confidence: number;
    amount?: string;
    deadline?: string;
  } {
    const text = `${email.subject} ${email.body_text}`.toLowerCase();
    
    const isApproval = text.includes('审批') || 
      text.includes('批复') || 
      text.includes('审核') || 
      text.includes('批准') ||
      text.includes('请批示');

    if (!isApproval) {
      return { isApproval: false, confidence: 0.1 };
    }

    // Extract amount
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*[万亿]?元?/);
    const amount = amountMatch ? `${amountMatch[1]}元` : undefined;

    // Extract deadline
    const deadlineMatch = text.match(/截止[\s:：]*(\d{1,2}[月/]\d{1,2}[日]?)/);
    const deadline = deadlineMatch ? deadlineMatch[1] : undefined;

    const confidence = amount && deadline ? 0.95 : amount || deadline ? 0.88 : 0.82;

    return { isApproval: true, confidence, amount, deadline };
  }

  private logAction(
    emailId: number,
    action: AuditLogEntry['action'],
    operator: string,
    result: string
  ): void {
    this.auditLog.push({
      emailId,
      action,
      timestamp: new Date(),
      operator,
      result,
    });
  }
}

export const approvalEngine = new ApprovalEngine();
