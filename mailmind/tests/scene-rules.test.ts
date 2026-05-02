import { describe, it, expect } from 'vitest';
import { sceneRules } from '../src/core/scene-recommend/scene-rules';
import type { SceneContext } from '../src/core/scene-recommend/scene-rules';

describe('Scene Rules', () => {
  it('triggers approval scene when >=2 pending approvals', () => {
    const ctx: SceneContext = {
      pendingApprovalCount: 3,
      highUrgencyApprovalCount: 1,
      unrepliedDiscussionCount: 0,
      reportCategoryCount: 0,
      totalWeekEmails: 20,
      dayOfWeek: 3,
      hour: 10,
    };

    const rule = sceneRules.find(r => r.sceneType === 'approval')!;
    const result = rule.check(ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('3');
    expect(result!.badge).toBe('紧急');
  });

  it('does not trigger approval scene when <2 approvals', () => {
    const ctx: SceneContext = {
      pendingApprovalCount: 1,
      highUrgencyApprovalCount: 0,
      unrepliedDiscussionCount: 0,
      reportCategoryCount: 0,
      totalWeekEmails: 10,
      dayOfWeek: 3,
      hour: 10,
    };

    const rule = sceneRules.find(r => r.sceneType === 'approval')!;
    expect(rule.check(ctx)).toBeNull();
  });

  it('triggers weekly report on Friday afternoon', () => {
    const ctx: SceneContext = {
      pendingApprovalCount: 0,
      highUrgencyApprovalCount: 0,
      unrepliedDiscussionCount: 0,
      reportCategoryCount: 3,
      totalWeekEmails: 25,
      dayOfWeek: 5,
      hour: 17,
    };

    const rule = sceneRules.find(r => r.sceneType === 'weekly_report')!;
    const result = rule.check(ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('周报');
  });

  it('triggers todo reminder when >=3 unreplied discussions', () => {
    const ctx: SceneContext = {
      pendingApprovalCount: 0,
      highUrgencyApprovalCount: 0,
      unrepliedDiscussionCount: 5,
      reportCategoryCount: 0,
      totalWeekEmails: 15,
      dayOfWeek: 2,
      hour: 14,
    };

    const rule = sceneRules.find(r => r.sceneType === 'todo')!;
    const result = rule.check(ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('5');
  });
});
