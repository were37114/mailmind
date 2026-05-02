import { describe, it, expect, beforeEach } from 'vitest';
import { reportGenerator } from '../../src/core/weekly-report/report-generator';
import { approvalRuleEngine } from '../../src/core/approval/rule-engine';
import { auditLog } from '../../src/core/approval/audit-log';
import { sceneRules } from '../../src/core/scene-recommend/scene-rules';
import { syncStateManager } from '../../src/core/sync/sync-state';
import type { Email } from '../../src/types';

const mockEmails: Email[] = [
  { id: 1, message_id: 'm1', thread_id: null, account_id: 'a1', from_name: '财务部', from_email: 'finance@co.com', to_list: [], cc_list: [], subject: '【审批】Q1预算', body_text: '请审批Q1预算50万，截止1月20日', date: new Date('2026-04-28'), has_attachment: false, category: 0, urgency: 2, confidence: 0.95, created_at: new Date() },
  { id: 2, message_id: 'm2', thread_id: null, account_id: 'a1', from_name: 'PM', from_email: 'pm@co.com', to_list: [], cc_list: [], subject: '项目进度', body_text: '本周项目进度正常，待确认', date: new Date('2026-04-29'), has_attachment: false, category: 2, urgency: 1, confidence: 0.85, created_at: new Date() },
  { id: 3, message_id: 'm3', thread_id: null, account_id: 'a1', from_name: '销售', from_email: 'sales@co.com', to_list: [], cc_list: [], subject: '月度汇报', body_text: '本月销售完成情况', date: new Date('2026-04-30'), has_attachment: false, category: 3, urgency: 0, confidence: 0.87, created_at: new Date() },
];

beforeEach(() => {
  (auditLog as any).entries = [];
  (syncStateManager as any).cache.clear();
});

describe('E2E Smoke Test', () => {
  it('full pipeline: sync → classify → approval → report → scene', () => {
    // 1. Sync state
    syncStateManager.markIdle('a1', 3, 3);
    expect(syncStateManager.get('a1')?.status).toBe('idle');

    // 2. Approval rule engine recall
    const approvalMatches = approvalRuleEngine.recall(mockEmails);
    expect(approvalMatches.length).toBeGreaterThanOrEqual(1);
    expect(approvalMatches.some(m => m.email.id === 1)).toBe(true);

    // 3. Audit log
    auditLog.append(1, 'approved', 'user1', 'Approved Q1 budget');
    const log = auditLog.getEntries(1);
    expect(log).toHaveLength(1);
    expect(auditLog.verifyChain()).toBe(true);

    // 4. Weekly report generation
    const weekStart = new Date('2026-04-27');
    const weekEnd = new Date('2026-05-03');

    const report = reportGenerator.generateReport(mockEmails, weekStart, weekEnd);
    expect(report.stats.totalEmails).toBe(3);
    const md = reportGenerator.exportToMarkdown(report);
    expect(md).toContain('工作周报');
    expect(md).toContain('审批事项');

    // 5. Scene rules
    const ctx = {
      pendingApprovalCount: 3,
      highUrgencyApprovalCount: 1,
      unrepliedDiscussionCount: 0,
      reportCategoryCount: 3,
      totalWeekEmails: 20,
      dayOfWeek: 5,
      hour: 17,
    };

    const triggered = sceneRules
      .map(r => r.check(ctx as any))
      .filter(Boolean);
    expect(triggered.length).toBeGreaterThanOrEqual(2);
  });
});
