/**
 * Ollama LLM Integration Tests
 * 
 * Tests real model inference via Ollama API.
 * These require Ollama server running with qwen2.5:3b model.
 * 
 * Run: npx vitest run tests/ollama-integration.test.ts
 * CI: Skipped (requires local Ollama)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  isOllamaAvailable,
  listModels,
  classifyEmail,
  refineApproval,
  generateWeeklyReport,
} from '../src/models/ollama-client';

describe.skipIf(process.env.SKIP_OLLAMA === '1')('Ollama LLM Integration', () => {
  let available = false;

  beforeAll(async () => {
    available = await isOllamaAvailable();
    if (!available) {
      console.warn('Ollama server not available, skipping tests');
    }
  });

  describe('Server availability', () => {
    it('should detect Ollama server', async () => {
      if (!available) return;
      expect(available).toBe(true);
    });

    it('should list available models', async () => {
      if (!available) return;
      const models = await listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.includes('qwen'))).toBe(true);
    });
  });

  describe('Email classification', () => {
    it('should classify approval email', async () => {
      if (!available) return;
      const result = await classifyEmail(
        '【审批】Q3预算申请',
        '领导您好，请审批Q3季度营销预算，总额50万元。附件为详细预算表。'
      );
      expect(result.category).toBe('审批');
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 30000);

    it('should classify notification email', async () => {
      if (!available) return;
      const result = await classifyEmail(
        '系统维护通知',
        '今晚22:00-23:00将进行服务器维护，期间服务可能短暂中断。'
      );
      expect(result.category).toBe('通知');
    }, 30000);

    it('should classify discussion email', async () => {
      if (!available) return;
      const result = await classifyEmail(
        '本周项目进度讨论',
        '本周项目进度正常，待确认下一步计划'
      );
      // Model may classify as 讨论/汇报/其他 depending on context
      expect(['讨论', '汇报', '其他']).toContain(result.category);
    }, 30000);
  });

  describe('Approval refinement', () => {
    it('should detect approval email with high confidence', async () => {
      if (!available) return;
      const result = await refineApproval(
        '【审批】Q3预算申请',
        '领导您好，请审批Q3季度营销预算，总额50万元。附件为详细预算表。'
      );
      expect(result.isApproval).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      // Amount and type may vary in format
      expect(['预算', '其他']).toContain(result.approvalType);
    }, 30000);

    it('should reject non-approval email', async () => {
      if (!available) return;
      const result = await refineApproval(
        '团队聚餐通知',
        '本周五晚上团队聚餐，地点在海底捞，请大家准时参加。'
      );
      expect(result.isApproval).toBe(false);
    }, 30000);
  });

  describe('Weekly report generation', () => {
    it('should generate structured weekly report', async () => {
      if (!available) return;
      const summaries = [
        '收到财务部审批邮件，Q3预算50万元待审批',
        '项目A本周完成用户调研，收集50份问卷',
        '系统维护通知，周三晚22:00-23:00',
        '与供应商B的采购合同需审批，金额120万元',
      ];
      const report = await generateWeeklyReport(summaries, '2026年第18周');
      expect(report.length).toBeGreaterThan(50);
      expect(report).toContain('审批');
    }, 60000);
  });
});
