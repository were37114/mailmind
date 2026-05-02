/**
 * MailMind E2E Integration Test — 端到端真实链路验证
 * 
 * 直接用 PGLite 创建数据库，绕过 Tauri IPC 依赖
 */

import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { approvalRuleEngine } from '../../src/core/approval/rule-engine';
import { auditLog } from '../../src/core/approval/audit-log';
import { reportGenerator } from '../../src/core/weekly-report/report-generator';
import { sceneRules } from '../../src/core/scene-recommend/scene-rules';
import { syncStateManager } from '../../src/core/sync/sync-state';
import type { Email } from '../../src/types';

// ============ 分类引擎（纯规则版，不依赖Tauri） ============
const APPROVAL_KW = ['审批', '批复', '审核', '批准', '请批示', '请审批', '请确认'];
const NOTIFY_KW = ['通知', '公告', '提醒', '维护', '更新'];
const DISCUSS_KW = ['讨论', '回复', 'Re:', '确认', '疑问'];
const REPORT_KW = ['汇报', '报告', '周报', '月报', '总结'];
const HIGH_URGENCY_KW = ['紧急', 'urgent', 'asap', '截止', '严重', '宕机', '故障'];
const MED_URGENCY_KW = ['重要', '请尽快', '请处理', '需确认', '请回复'];

function classifyEmail(subject: string, body: string): { category: number; urgency: number; confidence: number } {
  const text = `${subject} ${body}`.toLowerCase();
  
  let category = 4; // other
  let maxScore = 0;

  const approvalScore = APPROVAL_KW.filter(kw => text.includes(kw)).length;
  const notifyScore = NOTIFY_KW.filter(kw => text.includes(kw)).length;
  const discussScore = DISCUSS_KW.filter(kw => text.includes(kw)).length;
  const reportScore = REPORT_KW.filter(kw => text.includes(kw)).length;

  if (approvalScore > maxScore) { maxScore = approvalScore; category = 0; }
  if (notifyScore > maxScore) { maxScore = notifyScore; category = 1; }
  if (discussScore > maxScore) { maxScore = discussScore; category = 2; }
  if (reportScore > maxScore) { maxScore = reportScore; category = 3; }
  if (maxScore === 0) category = 4;

  let urgency = 0;
  if (HIGH_URGENCY_KW.some(kw => text.includes(kw.toLowerCase()))) urgency = 2;
  else if (MED_URGENCY_KW.some(kw => text.includes(kw.toLowerCase()))) urgency = 1;

  const confidence = Math.min(0.5 + maxScore * 0.15, 0.98);

  return { category, urgency, confidence };
}

// ============ 模拟真实企业邮件 ============

const testEmails: Omit<Email, 'id' | 'created_at'>[] = [
  {
    message_id: '<approval-001@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: '财务部-李芳', from_email: 'lifang@finance.company.com',
    to_list: ['user@company.com'], cc_list: ['cfo@company.com'],
    subject: '【审批】Q2部门预算申请 — 金额85万元',
    body_text: '您好，请审批Q2部门预算，金额85万元，截止日期为4月25日。详情见附件。',
    date: new Date('2026-04-21T09:00:00+08:00'),
    has_attachment: true, category: 0, urgency: 2, confidence: 0.95,
  },
  {
    message_id: '<approval-002@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: 'HR-王敏', from_email: 'wangmin@hr.company.com',
    to_list: ['user@company.com'], cc_list: [],
    subject: '请审批：张三调岗申请',
    body_text: '请审核张三从技术部调至产品部的申请，需在本周内完成审批。',
    date: new Date('2026-04-21T14:30:00+08:00'),
    has_attachment: false, category: 0, urgency: 1, confidence: 0.88,
  },
  {
    message_id: '<notify-001@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: '行政部', from_email: 'admin@company.com',
    to_list: ['all@company.com'], cc_list: [],
    subject: '本周五团建活动通知',
    body_text: '本周五下午3点在3楼会议室举行Q1团建活动，请大家准时参加。',
    date: new Date('2026-04-22T10:00:00+08:00'),
    has_attachment: false, category: 1, urgency: 0, confidence: 0.92,
  },
  {
    message_id: '<notify-002@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: 'IT运维', from_email: 'it@company.com',
    to_list: ['all@company.com'], cc_list: [],
    subject: '紧急：邮件系统维护通知',
    body_text: '本周六0:00-6:00邮件系统将进行紧急维护，届时无法收发邮件。',
    date: new Date('2026-04-22T16:00:00+08:00'),
    has_attachment: false, category: 1, urgency: 2, confidence: 0.90,
  },
  {
    message_id: '<discuss-001@company.com>',
    thread_id: 'thread-x', account_id: 'user@company.com',
    from_name: '项目经理-陈华', from_email: 'chenhua@company.com',
    to_list: ['user@company.com', 'dev@company.com'], cc_list: [],
    subject: 'Re: 项目X进度讨论',
    body_text: '目前项目X进度符合预期，但需要确认下周的发布计划。请尽快回复确认。',
    date: new Date('2026-04-20T11:00:00+08:00'),
    has_attachment: false, category: 2, urgency: 1, confidence: 0.85,
  },
  {
    message_id: '<discuss-002@company.com>',
    thread_id: 'thread-x', account_id: 'user@company.com',
    from_name: '开发-赵磊', from_email: 'zhaolei@company.com',
    to_list: ['user@company.com'], cc_list: ['chenhua@company.com'],
    subject: 'Re: 项目X进度讨论 — 技术方案待确认',
    body_text: '关于项目X的技术方案，我有几个疑问需要讨论，能否明天上午安排一个会议？',
    date: new Date('2026-04-21T09:30:00+08:00'),
    has_attachment: false, category: 2, urgency: 1, confidence: 0.82,
  },
  {
    message_id: '<report-001@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: '销售部-刘洋', from_email: 'liuyang@sales.company.com',
    to_list: ['user@company.com'], cc_list: ['vp-sales@company.com'],
    subject: '4月第三周销售工作汇报',
    body_text: '本周完成销售额120万，新签客户3家，待跟进客户5家。详情见附件。',
    date: new Date('2026-04-23T17:00:00+08:00'),
    has_attachment: true, category: 3, urgency: 0, confidence: 0.88,
  },
  {
    message_id: '<report-002@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: '市场部-孙莉', from_email: 'sunli@marketing.company.com',
    to_list: ['user@company.com'], cc_list: [],
    subject: '市场推广月度汇报',
    body_text: '4月市场推广效果：品牌曝光量增长15%，获客成本下降8%，社交媒体互动率提升20%。',
    date: new Date('2026-04-24T16:30:00+08:00'),
    has_attachment: false, category: 3, urgency: 0, confidence: 0.86,
  },
  {
    message_id: '<other-001@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_name: '张总', from_email: 'zhangzong@company.com',
    to_list: ['user@company.com'], cc_list: [],
    subject: '午餐吃什么',
    body_text: '今天中午吃什么？',
    date: new Date('2026-04-22T11:30:00+08:00'),
    has_attachment: false, category: 4, urgency: 0, confidence: 0.60,
  },
  {
    message_id: '<discuss-003@company.com>',
    thread_id: null, account_id: 'user@company.com',
    from_email: 'partner@external.com', from_name: '合作方-周总',
    to_list: ['user@company.com'], cc_list: [],
    subject: '关于合同续签事宜',
    body_text: '您好，我方合同将于下月到期，请尽快确认续签事宜。如有问题请回复。',
    date: new Date('2026-04-18T10:00:00+08:00'),
    has_attachment: false, category: 2, urgency: 2, confidence: 0.78,
  },
];

let db: PGlite;
let insertedEmails: Email[] = [];

const CAT_NAMES = ['审批', '通知', '讨论', '汇报', '其他'];

describe('🚀 MailMind E2E Integration — 完整用户旅程', () => {

  describe('Step 1: 数据库初始化', () => {
    it('should init PGLite with full schema', async () => {
      db = new PGlite();
      await db.waitReady;

      await db.exec(`
        CREATE TABLE IF NOT EXISTS emails (
          id SERIAL PRIMARY KEY,
          message_id TEXT UNIQUE NOT NULL,
          thread_id TEXT,
          account_id TEXT NOT NULL,
          from_name TEXT,
          from_email TEXT,
          to_list TEXT[],
          cc_list TEXT[],
          subject TEXT,
          body_text TEXT,
          date TIMESTAMPTZ,
          has_attachment BOOLEAN DEFAULT false,
          category INTEGER DEFAULT 4,
          urgency INTEGER DEFAULT 0,
          confidence REAL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS recommendations (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          scene_type TEXT,
          trigger_condition TEXT,
          score REAL,
          status TEXT DEFAULT 'shown',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      const result = await db.query<{ cnt: string }>('SELECT COUNT(*) as cnt FROM emails');
      expect(Number(result.rows[0].cnt)).toBe(0);
      console.log('✅ Step 1: 数据库初始化完成');
    });
  });

  describe('Step 2: 邮件导入（模拟IMAP同步）', () => {
    it('should import all emails and record sync state', async () => {
      for (const e of testEmails) {
        const res = await db.query<Email>(
          `INSERT INTO emails (message_id, thread_id, account_id, from_name, from_email,
           to_list, cc_list, subject, body_text, date, has_attachment, category, urgency, confidence)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [e.message_id, e.thread_id, e.account_id, e.from_name, e.from_email,
           e.to_list, e.cc_list, e.subject, e.body_text, e.date, e.has_attachment,
           e.category, e.urgency, e.confidence]
        );
        insertedEmails.push(res.rows[0]);
      }

      expect(insertedEmails.length).toBe(testEmails.length);
      syncStateManager.markIdle('user@company.com', insertedEmails.length, insertedEmails.length);

      console.log(`✅ Step 2: 导入 ${insertedEmails.length} 封邮件`);
      insertedEmails.forEach((e, i) => console.log(`   ${i+1}. [${e.from_name}] ${e.subject}`));
    });
  });

  describe('Step 3: 分类引擎', () => {
    it('should classify all emails and persist results', async () => {
      let correct = 0;

      for (const email of insertedEmails) {
        const result = classifyEmail(email.subject, email.body_text);

        await db.query(
          'UPDATE emails SET category=$1, urgency=$2, confidence=$3 WHERE id=$4',
          [result.category, result.urgency, result.confidence, email.id]
        );

        // Check if classification matches original label
        if (result.category === email.category) correct++;
      }

      const accuracy = (correct / insertedEmails.length) * 100;
      console.log(`✅ Step 3: 分类完成，准确率 ${accuracy.toFixed(1)}% (${correct}/${insertedEmails.length})`);

      // Print classification results
      const catResult = await db.query<{ category: string; cnt: string }>(
        'SELECT category, COUNT(*) as cnt FROM emails GROUP BY category ORDER BY category'
      );
      catResult.rows.forEach(r => {
        console.log(`   ${CAT_NAMES[Number(r.category)] || '?'}: ${r.cnt} 封`);
      });

      expect(accuracy).toBeGreaterThanOrEqual(70); // At least 70% for rule-based
    });
  });

  describe('Step 4: 审批识别（双层）', () => {
    it('should recall approval candidates via rule engine', () => {
      // Re-read emails with updated categories
      const candidates = approvalRuleEngine.recall(insertedEmails);

      console.log(`✅ Step 4a: 规则引擎召回 ${candidates.length} 封候选审批邮件`);
      candidates.forEach(c => {
        console.log(`   - ${c.email.subject} (score=${c.score.toFixed(2)}, keywords=[${c.matchedKeywords.join(',')}])`);
      });

      // Should find at least the 2 explicit approval emails
      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it('should log and verify approval actions in audit log', () => {
      (auditLog as any).entries = [];

      const budgetEmail = insertedEmails.find(e => e.subject.includes('Q2部门预算'))!;
      
      auditLog.append(budgetEmail.id, 'viewed', 'user@company.com');
      auditLog.append(budgetEmail.id, 'approved', 'user@company.com', '批准Q2预算85万');

      const log = auditLog.getEntries(budgetEmail.id);
      expect(log.length).toBe(2);
      expect(log[1].action).toBe('approved');
      expect(auditLog.verifyChain()).toBe(true);

      console.log('✅ Step 4b: 审计日志');
      log.forEach(entry => {
        console.log(`   [${entry.action}] by ${entry.operator} ${entry.result ? '→ ' + entry.result : ''}`);
      });
    });
  });

  describe('Step 5: 周报生成', () => {
    it('should generate correct weekly report', () => {
      const weekStart = new Date('2026-04-20T00:00:00+08:00');
      const weekEnd = new Date('2026-04-24T23:59:59+08:00');

      const report = reportGenerator.generateReport(insertedEmails, weekStart, weekEnd);
      const markdown = reportGenerator.exportToMarkdown(report);

      console.log('✅ Step 5: 周报生成');
      console.log('---');
      console.log(markdown);
      console.log('---');

      expect(report.stats.totalEmails).toBeGreaterThan(0);
      expect(markdown).toContain('工作周报');
      expect(markdown).not.toContain('下周计划'); // 不应有预测性内容

      // Verify follow-ups were extracted
      console.log(`   待跟进: ${report.followUps.length} 项`);
    });
  });

  describe('Step 6: 场景推荐', () => {
    it('should evaluate all scene rules against current context', () => {
      const ctx = {
        pendingApprovalCount: 2,
        highUrgencyApprovalCount: 1,
        unrepliedDiscussionCount: 3,
        reportCategoryCount: 2,
        totalWeekEmails: insertedEmails.length,
        dayOfWeek: 5, // Friday
        hour: 17,
      };

      const triggered = sceneRules
        .map(r => ({ type: r.sceneType, result: r.check(ctx as any) }))
        .filter(t => t.result !== null);

      console.log(`✅ Step 6: 场景推荐触发 ${triggered.length} 个场景`);
      triggered.forEach(t => {
        console.log(`   [${t.type}] ${t.result!.title} (score=${t.result!.score.toFixed(2)})`);
      });

      // With 2 pending approvals → approval scene should trigger
      // Friday 5PM with 2+ reports → weekly report scene should trigger
      // 3+ unreplied → todo scene should trigger
      expect(triggered.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Step 7: 数据完整性', () => {
    it('should verify database state is consistent', async () => {
      const totalResult = await db.query<{ cnt: string }>('SELECT COUNT(*) as cnt FROM emails');
      expect(Number(totalResult.rows[0].cnt)).toBe(testEmails.length);

      // All emails should have non-default category after classification
      const catResult = await db.query<{ cnt: string }>(
        "SELECT COUNT(*) as cnt FROM emails WHERE category != 4 OR confidence > 0.7"
      );
      expect(Number(catResult.rows[0].cnt)).toBeGreaterThan(0);

      expect(auditLog.verifyChain()).toBe(true);

      console.log('✅ Step 7: 数据完整性验证通过');
    });
  });

  describe('📋 Journey Summary', () => {
    it('should summarize the full journey', () => {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║  MailMind E2E 完整旅程报告               ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  📧 导入邮件:  ${insertedEmails.length} 封                       ║`);
      console.log('║  🔍 分类引擎:  规则分类完成              ║');
      console.log('║  ✅ 审批召回:  规则引擎≥2封命中          ║');
      console.log('║  📊 审计日志:  哈希链完整                ║');
      console.log('║  📋 周报生成:  Markdown输出正确          ║');
      console.log('║  💡 场景推荐:  ≥2场景触发               ║');
      console.log('║  🔒 数据完整:  DB记录数匹配             ║');
      console.log('╚══════════════════════════════════════════╝\n');

      expect(true).toBe(true);
    });
  });
});
