import React, { useState } from 'react';
import OnboardingWizard from '../pages/OnboardingWizard';
import CategoryBadge from '../components/CategoryBadge';
import UrgencyIndicator from '../components/UrgencyIndicator';

interface Email {
  id: number;
  subject: string;
  from_name: string;
  from_email: string;
  category: number;
  urgency: number;
  confidence: number;
  date: string;
}

// Mock data for demo
const mockEmails: Email[] = [
  { id: 1, subject: '【审批】Q1预算申请', from_name: '财务部', from_email: 'finance@company.com', category: 0, urgency: 2, confidence: 0.95, date: '2024-01-15' },
  { id: 2, subject: '本周会议通知', from_name: '行政部', from_email: 'admin@company.com', category: 1, urgency: 0, confidence: 0.88, date: '2024-01-15' },
  { id: 3, subject: 'Re: 项目进度讨论', from_name: '项目经理', from_email: 'pm@company.com', category: 2, urgency: 1, confidence: 0.85, date: '2024-01-14' },
  { id: 4, subject: '月度工作汇报', from_name: '销售部', from_email: 'sales@company.com', category: 3, urgency: 0, confidence: 0.87, date: '2024-01-13' },
];

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return (
      <div className="app">
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

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
          <h2>MailMind</h2>
          <p>AI 邮件助手</p>
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
          <button className="btn-secondary" onClick={() => setShowOnboarding(true)}>
            重新配置
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
                    <span className="email-date">{email.date}</span>
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

          {activeTab === 'approvals' && (
            <div className="approval-panel">
              <h2>待审批邮件</h2>
              <p>检测到 2 封需要审批的邮件</p>
              <div className="approval-list">
                {mockEmails.filter(e => e.category === 0).map(email => (
                  <div key={email.id} className="approval-item urgent">
                    <div className="approval-header">
                      <span className="approval-subject">{email.subject}</span>
                      <UrgencyIndicator urgency={email.urgency} />
                    </div>
                    <div className="approval-actions">
                      <button className="btn-success">通过</button>
                      <button className="btn-danger">驳回</button>
                      <button className="btn-secondary">转交</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="report-panel">
              <h2>周报生成</h2>
              <p>基于本周邮件自动生成工作周报</p>
              <button className="btn-primary">生成本周周报</button>
              <div className="report-preview">
                <h3>预览</h3>
                <pre>{`# 工作周报

**时间**: 1月15日 - 1月19日

## 本周概览
- 总邮件数: 15
- 审批事项: 2
- 项目讨论: 3
- 工作汇报: 2

## 审批事项
- 【审批】Q1预算申请 (高优先级)

## 待跟进事项
- [ ] 项目进度讨论 - 待确认`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'recommend' && (
            <div className="recommend-panel">
              <h2>智能推荐</h2>
              <div className="scene-cards">
                <div className="scene-card urgent">
                  <div className="scene-header">
                    <span className="scene-badge">紧急</span>
                    <span className="scene-score">95%</span>
                  </div>
                  <h3>您有 2 封待审批邮件</h3>
                  <p>其中 1 封为高优先级，请尽快处理</p>
                  <button className="btn-primary">查看审批汇总</button>
                </div>
                
                <div className="scene-card">
                  <div className="scene-header">
                    <span className="scene-score">75%</span>
                  </div>
                  <h3>您有 3 封邮件待回复</h3>
                  <p>部分讨论邮件已超过3天未回复</p>
                  <button className="btn-secondary">查看待办</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
