import React, { useState } from 'react';
import { reportGenerator, type WeeklyReport } from '../core/weekly-report/report-generator';
import type { Email } from '../types';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ModelLoadingIndicator from '../components/ModelLoadingIndicator';

// Mock emails for demo — in production these come from the DB
const mockEmails: Email[] = [
  { id: 1, message_id: 'm1', thread_id: null, account_id: 'a1', from_name: '财务部', from_email: 'finance@co.com', to_list: [], cc_list: [], subject: '【审批】Q1预算申请', body_text: '请审批Q1预算，金额50万元，截止1月20日', date: new Date(), has_attachment: false, category: 0, urgency: 2, confidence: 0.95, created_at: new Date() },
  { id: 2, message_id: 'm2', thread_id: null, account_id: 'a1', from_name: '项目经理', from_email: 'pm@co.com', to_list: [], cc_list: [], subject: 'Re: 项目进度讨论', body_text: '本周项目进度正常，待确认下一步计划', date: new Date(), has_attachment: false, category: 2, urgency: 1, confidence: 0.85, created_at: new Date() },
  { id: 3, message_id: 'm3', thread_id: null, account_id: 'a1', from_name: '销售部', from_email: 'sales@co.com', to_list: [], cc_list: [], subject: '月度工作汇报', body_text: '本月销售目标完成情况汇报', date: new Date(), has_attachment: false, category: 3, urgency: 0, confidence: 0.87, created_at: new Date() },
];

const WeeklyReportPage: React.FC = () => {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    // Simulate 7B model processing time
    await new Promise(r => setTimeout(r, 2000));
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(now);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const r = reportGenerator.generateReport(mockEmails, weekStart, weekEnd);
    const md = reportGenerator.exportToMarkdown(r);
    setReport(r);
    setMarkdown(md);
    setEditedMarkdown(md);
    setGenerating(false);
  };

  const handleSaveEdit = () => {
    setMarkdown(editedMarkdown);
    setEditing(false);
  };

  const handleExport = (format: 'markdown' | 'text') => {
    const content = format === 'markdown' ? editedMarkdown : editedMarkdown.replace(/[#*_`]/g, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `周报_${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  if (generating) {
    return (
      <div className="weekly-report-page">
        <h2>周报生成</h2>
        <ModelLoadingIndicator message="7B 模型分析中，正在生成周报..." />
        <LoadingSkeleton count={5} type="line" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="weekly-report-page">
        <h2>周报生成</h2>
        <EmptyState
          icon="📊"
          title="生成本周周报"
          description="基于本周邮件自动生成工作周报，确保事实准确"
          actionLabel="生成周报"
          onAction={generateReport}
        />
      </div>
    );
  }

  return (
    <div className="weekly-report-page">
      <div className="report-header">
        <h2>周报 — {report.weekRange}</h2>
        <div className="report-header__actions">
          <button className="btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? '取消编辑' : '✏️ 编辑'}
          </button>
          <button className="btn-secondary" onClick={() => setShowExport(!showExport)}>
            📤 导出
          </button>
          <button className="btn-primary" onClick={generateReport}>
            🔄 重新生成
          </button>
        </div>
      </div>

      <div className="report-stats">
        <span>📧 总邮件: {report.stats.totalEmails}</span>
        <span>✅ 审批: {report.stats.approvalCount}</span>
        <span>💬 讨论: {report.stats.discussionCount}</span>
        <span>📋 汇报: {report.stats.reportCount}</span>
      </div>

      {editing ? (
        <div className="report-editor">
          <textarea
            className="report-editor__textarea"
            value={editedMarkdown}
            onChange={e => setEditedMarkdown(e.target.value)}
            rows={20}
          />
          <div className="report-editor__actions">
            <button className="btn-primary" onClick={handleSaveEdit}>💾 保存</button>
            <button className="btn-secondary" onClick={() => { setEditedMarkdown(markdown); setEditing(false); }}>取消</button>
          </div>
        </div>
      ) : (
        <div className="report-preview">
          <pre>{markdown}</pre>
        </div>
      )}

      {report.followUps.length > 0 && (
        <div className="report-followups">
          <h3>📌 待跟进事项</h3>
          <ul>
            {report.followUps.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {showExport && (
        <div className="export-modal">
          <h3>导出周报</h3>
          <button className="btn-primary" onClick={() => handleExport('markdown')}>Markdown (.md)</button>
          <button className="btn-secondary" onClick={() => handleExport('text')}>纯文本 (.txt)</button>
          <button className="btn-secondary" onClick={() => setShowExport(false)}>取消</button>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportPage;
