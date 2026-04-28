import type { Email } from '../../types';

export interface WeeklyReport {
  weekRange: string;
  summary: ReportSection[];
  followUps: string[];
  stats: {
    totalEmails: number;
    approvalCount: number;
    discussionCount: number;
    reportCount: number;
  };
}

export interface ReportSection {
  title: string;
  items: string[];
}

class ReportGenerator {
  generateReport(emails: Email[], startDate: Date, endDate: Date): WeeklyReport {
    const weekEmails = emails.filter(e => {
      const date = new Date(e.date);
      return date >= startDate && date <= endDate;
    });

    // Group by category
    const byCategory: Record<number, Email[]> = {
      0: [], // approval
      1: [], // notification
      2: [], // discussion
      3: [], // report
      4: [], // other
    };

    for (const email of weekEmails) {
      if (byCategory[email.category]) {
        byCategory[email.category].push(email);
      }
    }

    // Generate summary sections
    const summary: ReportSection[] = [];

    // Approval section
    if (byCategory[0].length > 0) {
      summary.push({
        title: '审批事项',
        items: byCategory[0].map(e => 
          `- ${e.subject}${e.confidence > 0.9 ? '' : ' (待确认)'}`
        ),
      });
    }

    // Discussion section
    if (byCategory[2].length > 0) {
      summary.push({
        title: '项目讨论',
        items: byCategory[2].map(e => `- ${e.subject}`),
      });
    }

    // Report section
    if (byCategory[3].length > 0) {
      summary.push({
        title: '工作汇报',
        items: byCategory[3].map(e => `- ${e.subject}`),
      });
    }

    // Extract follow-ups
    const followUps = this.extractFollowUps(weekEmails);

    return {
      weekRange: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
      summary,
      followUps,
      stats: {
        totalEmails: weekEmails.length,
        approvalCount: byCategory[0].length,
        discussionCount: byCategory[2].length,
        reportCount: byCategory[3].length,
      },
    };
  }

  exportToMarkdown(report: WeeklyReport): string {
    const lines: string[] = [
      `# 工作周报`,
      ``,
      `**时间**: ${report.weekRange}`,
      ``,
      `## 本周概览`,
      ``,
      `- 总邮件数: ${report.stats.totalEmails}`,
      `- 审批事项: ${report.stats.approvalCount}`,
      `- 项目讨论: ${report.stats.discussionCount}`,
      `- 工作汇报: ${report.stats.reportCount}`,
      ``,
    ];

    for (const section of report.summary) {
      lines.push(`## ${section.title}`);
      lines.push('');
      for (const item of section.items) {
        lines.push(item);
      }
      lines.push('');
    }

    if (report.followUps.length > 0) {
      lines.push('## 待跟进事项');
      lines.push('');
      for (const item of report.followUps) {
        lines.push(`- [ ] ${item}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private extractFollowUps(emails: Email[]): string[] {
    const followUps: string[] = [];
    const keywords = ['待完成', 'pending', 'todo', '待确认', '待回复', '待处理'];

    for (const email of emails) {
      const text = `${email.subject} ${email.body_text}`;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          followUps.push(`${email.subject} - ${keyword}`);
          break;
        }
      }
    }

    return [...new Set(followUps)];
  }

  private formatDate(date: Date): string {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

export const reportGenerator = new ReportGenerator();
