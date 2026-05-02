import React, { useState } from 'react';
import CategoryBadge from '../components/CategoryBadge';
import UrgencyIndicator from '../components/UrgencyIndicator';
import ApprovalDashboard from '../pages/ApprovalDashboard';
import WeeklyReportPage from '../pages/WeeklyReport';
import ScenePanel from '../components/ScenePanel';
import SyncStatus from '../components/SyncStatus';
import type { Email } from '../types';

// Mock data for inbox demo
const mockEmails: Email[] = [
  { id: 1, message_id: 'm1', thread_id: null, account_id: 'a1', from_name: '财务部', from_email: 'finance@company.com', to_list: [], cc_list: [], subject: '【审批】Q1预算申请', body_text: '请审批Q1预算，金额50万元', date: new Date(), has_attachment: false, category: 0, urgency: 2, confidence: 0.95, created_at: new Date() },
  { id: 2, message_id: 'm2', thread_id: null, account_id: 'a1', from_name: '行政部', from_email: 'admin@company.com', to_list: [], cc_list: [], subject: '本周会议通知', body_text: '本周五下午3点部门例会', date: new Date(), has_attachment: false, category: 1, urgency: 0, confidence: 0.88, created_at: new Date() },
  { id: 3, message_id: 'm3', thread_id: null, account_id: 'a1', from_name: '项目经理', from_email: 'pm@company.com', to_list: [], cc_list: [], subject: 'Re: 项目进度讨论', body_text: '本周项目进度正常，待确认下一步', date: new Date(), has_attachment: false, category: 2, urgency: 1, confidence: 0.85, created_at: new Date() },
  { id: 4, message_id: 'm4', thread_id: null, account_id: 'a1', from_name: '销售部', from_email: 'sales@company.com', to_list: [], cc_list: [], subject: '月度工作汇报', body_text: '本月销售目标完成情况汇报', date: new Date(), has_attachment: false, category: 3, urgency: 0, confidence: 0.87, created_at: new Date() },
];

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const tabs = [
    { id: 'inbox', label: '收件箱', icon: '📧' },
    { id: 'approvals', label: '审批', icon: '✅' },
    { id: 'reports', label: '周报', icon: '📊' },
    { id: 'recommend', label: '推荐', icon: '💡' },
  ];

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h2>🫑 MailMind</h2>
          <p>AI 邮件第二大脑</p>
        </div>

        <nav className="nav-menu">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SyncStatus totalFetched={156} status="idle" lastSyncTime={new Date()} />
          <button className="theme-toggle" onClick={toggleTheme} style={{ marginTop: 8 }}>
            {theme === 'light' ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
          <div className="header-actions">
            <input type="text" placeholder="搜索邮件..." className="search-input" />
            <button className="btn-primary">同步</button>
          </div>
        </header>

        <div className="content-body">
          {activeTab === 'inbox' && (
            <div className="email-list">
              {mockEmails.map(email => (
                <div key={email.id} className="email-item">
                  <div className="email-meta">
                    <span className="email-sender">{email.from_name}</span>
                    <span className="email-date">{new Date(email.date).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="email-title">
                    <span className="email-subject">{email.subject}</span>
                    <div className="email-badges">
                      <CategoryBadge category={email.category} confidence={email.confidence} />
                      <UrgencyIndicator urgency={email.urgency} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'approvals' && <ApprovalDashboard />}
          {activeTab === 'reports' && <WeeklyReportPage />}
          {activeTab === 'recommend' && <ScenePanel />}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
