import { emailRepo, recommendationRepo } from '../../db/repositories';

export interface SceneCard {
  id: string;
  sceneType: 'approval' | 'weekly_report' | 'todo';
  title: string;
  description: string;
  score: number;
  actionText: string;
  badge?: string;
}

class SceneRecommendEngine {
  async generateRecommendations(userId: string): Promise<SceneCard[]> {
    const cards: SceneCard[] = [];

    // Check approval scene
    const approvalCard = await this.checkApprovalScene(userId);
    if (approvalCard) cards.push(approvalCard);

    // Check weekly report scene
    const reportCard = await this.checkWeeklyReportScene(userId);
    if (reportCard) cards.push(reportCard);

    // Check todo scene
    const todoCard = await this.checkTodoScene(userId);
    if (todoCard) cards.push(todoCard);

    // Sort by score
    return cards.sort((a, b) => b.score - a.score);
  }

  private async checkApprovalScene(_userId: string): Promise<SceneCard | null> {
    const pendingApprovals = await emailRepo.findByCategory(0);
    const unhandled = pendingApprovals.filter(e => e.urgency >= 1);

    if (unhandled.length >= 2) {
      return {
        id: `approval-${Date.now()}`,
        sceneType: 'approval',
        title: `您有 ${unhandled.length} 封待审批邮件`,
        description: `其中 ${unhandled.filter(e => e.urgency === 2).length} 封为高优先级`,
        score: this.calculateScore(unhandled.length, unhandled.some(e => e.urgency === 2)),
        actionText: '查看审批汇总',
        badge: unhandled.some(e => e.urgency === 2) ? '紧急' : undefined,
      };
    }

    return null;
  }

  private async checkWeeklyReportScene(_userId: string): Promise<SceneCard | null> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Friday afternoon (4PM+)
    if (dayOfWeek === 5 && hour >= 16) {
      const weekEmails = await emailRepo.findByAccount(_userId, 50);
      const reportEmails = weekEmails.filter(e => e.category === 3);

      if (reportEmails.length >= 2) {
        return {
          id: `weekly-${Date.now()}`,
          sceneType: 'weekly_report',
          title: '生成本周周报',
          description: `本周有 ${weekEmails.length} 封工作相关邮件，可生成周报`,
          score: 0.9,
          actionText: '生成周报',
        };
      }
    }

    return null;
  }

  private async checkTodoScene(userId: string): Promise<SceneCard | null> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentEmails = await emailRepo.findByAccount(userId, 100);
    const unreplied = recentEmails.filter(e => {
      const date = new Date(e.date);
      return date < threeDaysAgo && e.category === 2 && e.urgency >= 1;
    });

    if (unreplied.length >= 3) {
      return {
        id: `todo-${Date.now()}`,
        sceneType: 'todo',
        title: `您有 ${unreplied.length} 封邮件待回复`,
        description: '部分讨论邮件已超过3天未回复',
        score: 0.75,
        actionText: '查看待办',
        badge: '待处理',
      };
    }

    return null;
  }

  private calculateScore(count: number, hasUrgent: boolean): number {
    let score = 0.5;
    score += Math.min(count * 0.1, 0.3);
    if (hasUrgent) score += 0.2;
    return Math.min(score, 1.0);
  }

  async recordFeedback(cardId: string, userId: string, isHelpful: boolean): Promise<void> {
    // Store feedback for future recommendation tuning
    await recommendationRepo.create({
      user_id: userId,
      scene_type: cardId.startsWith('approval') ? 'approval' : 
                   cardId.startsWith('weekly') ? 'weekly_report' : 'todo',
      trigger_condition: `feedback_${isHelpful ? 'positive' : 'negative'}`,
      score: isHelpful ? 1.0 : 0.0,
      status: isHelpful ? 'clicked' : 'dismissed',
    });
  }
}

export const sceneEngine = new SceneRecommendEngine();
