import type { Email } from '../../types';

/**
 * Rule-based approval recall engine (Layer 1).
 * High recall, may have false positives — filtered by 7B model in Layer 2.
 */

// Approval-indicating keywords
const APPROVAL_KEYWORDS = [
  '审批', '批复', '审核', '批准', '请批示', '请审批',
  '核准', '同意', '申请', '报批', '签批', '签核',
  '请确认', '待审批', '待审核',
  '额度提升', '续签', '签署', '合同', '需求',
  '变更', '退回', '加急', '催办',
];

// Sender whitelist (domains/patterns that frequently send approval emails)
const APPROVAL_SENDER_DOMAINS = [
  'finance', 'audit', 'hr', 'legal', 'admin', 'compliance',
];

export interface RuleMatch {
  email: Email;
  matchedKeywords: string[];
  matchedSenderDomain: boolean;
  score: number; // 0-1, higher = more likely approval
}

class ApprovalRuleEngine {
  /**
   * Recall approval candidates from a list of emails.
   * Targets >99% recall — better to over-match than miss a real approval.
   */
  recall(emails: Email[]): RuleMatch[] {
    const matches: RuleMatch[] = [];

    for (const email of emails) {
      const match = this.evaluate(email);
      if (match) {
        matches.push(match);
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  evaluate(email: Email): RuleMatch | null {
    const text = `${email.subject} ${email.body_text}`.toLowerCase();
    const matchedKeywords = APPROVAL_KEYWORDS.filter(kw => text.includes(kw));
    const senderDomain = email.from_email.split('@')[1]?.split('.')[0] ?? '';
    const matchedSenderDomain = APPROVAL_SENDER_DOMAINS.includes(senderDomain);

    if (matchedKeywords.length === 0 && !matchedSenderDomain) {
      // Also check category label from 0.5B classifier
      if (email.category !== 0) return null;
      // Category says approval but no keyword match — include with low score
      return { email, matchedKeywords: [], matchedSenderDomain: false, score: 0.3 };
    }

    let score = 0;
    score += Math.min(matchedKeywords.length * 0.25, 0.6);
    if (matchedSenderDomain) score += 0.2;
    if (email.category === 0) score += 0.15;
    if (email.urgency === 2) score += 0.05;
    score = Math.min(score, 1.0);

    return { email, matchedKeywords, matchedSenderDomain, score };
  }
}

export const approvalRuleEngine = new ApprovalRuleEngine();
