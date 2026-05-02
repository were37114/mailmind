/**
 * Scene recommendation rules for the 3 MVP scene types.
 */

export interface SceneRule {
  sceneType: 'approval' | 'weekly_report' | 'todo';
  check: (context: SceneContext) => SceneRuleResult | null;
}

export interface SceneContext {
  pendingApprovalCount: number;
  highUrgencyApprovalCount: number;
  unrepliedDiscussionCount: number;
  reportCategoryCount: number;
  totalWeekEmails: number;
  dayOfWeek: number; // 0=Sun, 5=Fri
  hour: number;
}

export interface SceneRuleResult {
  title: string;
  description: string;
  score: number;
  badge?: string;
}

export const sceneRules: SceneRule[] = [
  // Rule 1: Approval summary (≥2 unhandled approval emails)
  {
    sceneType: 'approval',
    check(ctx) {
      if (ctx.pendingApprovalCount >= 2) {
        const score = 0.35 * Math.min(ctx.highUrgencyApprovalCount > 0 ? 1 : 0.5, 1)
          + 0.30 * Math.min(ctx.pendingApprovalCount / 5, 1)
          + 0.20 * 0.5 // neutral history
          + 0.15 * 0.8; // approval is frequent
        return {
          title: `您有 ${ctx.pendingApprovalCount} 封待审批邮件`,
          description: `其中 ${ctx.highUrgencyApprovalCount} 封为高优先级，请尽快处理`,
          score: Math.min(score, 1),
          badge: ctx.highUrgencyApprovalCount > 0 ? '紧急' : undefined,
        };
      }
      return null;
    },
  },

  // Rule 2: Weekly report (Friday 4PM+ with ≥2 report emails)
  {
    sceneType: 'weekly_report',
    check(ctx) {
      if (ctx.dayOfWeek === 5 && ctx.hour >= 16 && ctx.reportCategoryCount >= 2) {
        return {
          title: '生成本周周报',
          description: `本周有 ${ctx.totalWeekEmails} 封工作相关邮件，可生成周报`,
          score: 0.9,
        };
      }
      return null;
    },
  },

  // Rule 3: Todo reminder (≥3 unreplied discussion emails older than 3 days)
  {
    sceneType: 'todo',
    check(ctx) {
      if (ctx.unrepliedDiscussionCount >= 3) {
        return {
          title: `您有 ${ctx.unrepliedDiscussionCount} 封邮件待回复`,
          description: '部分讨论邮件已超过3天未回复',
          score: 0.75,
          badge: '待处理',
        };
      }
      return null;
    },
  },
];
