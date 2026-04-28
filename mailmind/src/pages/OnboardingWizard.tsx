import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AccountConfig {
  email: string;
  server: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}

interface OnboardingProps {
  onComplete: () => void;
}

const OnboardingWizard: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState<AccountConfig>({
    email: '',
    server: '',
    port: 993,
    username: '',
    password: '',
    useTls: true,
  });
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const detectServer = (email: string): string => {
    const domain = email.split('@')[1];
    if (!domain) return '';
    
    // Common IMAP servers
    const knownServers: Record<string, string> = {
      'gmail.com': 'imap.gmail.com',
      'outlook.com': 'outlook.office365.com',
      'hotmail.com': 'outlook.office365.com',
      'live.com': 'outlook.office365.com',
      'qq.com': 'imap.qq.com',
      '163.com': 'imap.163.com',
      '126.com': 'imap.126.com',
    };
    
    return knownServers[domain] || `imap.${domain}`;
  };

  const handleEmailChange = (email: string) => {
    setAccount(prev => ({
      ...prev,
      email,
      server: detectServer(email),
      username: email,
    }));
  };

  const handleConnect = async () => {
    setError('');
    setIsSyncing(true);
    
    try {
      // Test connection
      await invoke('test_imap_connection', {
        server: account.server,
        port: account.port,
        username: account.username,
        password: account.password,
        useTls: account.useTls,
      });
      
      setStep(2); // Move to sync progress
      startSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败');
      setIsSyncing(false);
    }
  };

  const startSync = async () => {
    setSyncProgress(0);
    
    // Simulate sync progress (in real app, this would come from backend events)
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep(3), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const renderWelcome = () => (
    <div className="onboarding-step">
      <h1>欢迎使用 MailMind</h1>
      <p>AI 邮件第二大脑，让邮件管理更智能</p>
      <ul className="feature-list">
        <li>✉️ 自动分类邮件（审批/通知/讨论/汇报）</li>
        <li>📋 智能审批汇总</li>
        <li>📊 一键生成周报</li>
        <li>🔔 场景化任务推荐</li>
        <li>🔒 本地 AI，数据不出机</li>
      </ul>
      <button className="btn-primary" onClick={() => setStep(1)}>
        开始使用
      </button>
    </div>
  );

  const renderAccountConfig = () => (
    <div className="onboarding-step">
      <h2>配置邮箱账户</h2>
      <p>MailMind 支持 IMAP 协议连接您的邮箱</p>
      
      <div className="form-group">
        <label>邮箱地址</label>
        <input
          type="email"
          value={account.email}
          onChange={e => handleEmailChange(e.target.value)}
          placeholder="your@email.com"
        />
      </div>
      
      <div className="form-group">
        <label>IMAP 服务器</label>
        <input
          type="text"
          value={account.server}
          onChange={e => setAccount(prev => ({ ...prev, server: e.target.value }))}
          placeholder="imap.example.com"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>端口</label>
          <input
            type="number"
            value={account.port}
            onChange={e => setAccount(prev => ({ ...prev, port: parseInt(e.target.value) }))}
          />
        </div>
        
        <div className="form-group">
          <label>TLS</label>
          <input
            type="checkbox"
            checked={account.useTls}
            onChange={e => setAccount(prev => ({ ...prev, useTls: e.target.checked }))}
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>用户名</label>
        <input
          type="text"
          value={account.username}
          onChange={e => setAccount(prev => ({ ...prev, username: e.target.value }))}
        />
      </div>
      
      <div className="form-group">
        <label>密码 / 授权码</label>
        <input
          type="password"
          value={account.password}
          onChange={e => setAccount(prev => ({ ...prev, password: e.target.value }))}
          placeholder="请输入邮箱密码或授权码"
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="button-group">
        <button className="btn-secondary" onClick={() => setStep(0)}>
          返回
        </button>
        <button 
          className="btn-primary" 
          onClick={handleConnect}
          disabled={isSyncing || !account.email || !account.password}
        >
          {isSyncing ? '连接中...' : '连接并同步'}
        </button>
      </div>
    </div>
  );

  const renderSyncProgress = () => (
    <div className="onboarding-step">
      <h2>正在同步邮件</h2>
      <p>首次同步可能需要几分钟，请耐心等待</p>
      
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${syncProgress}%` }} />
      </div>
      
      <p className="progress-text">{syncProgress}%</p>
      
      <div className="sync-status">
        {syncProgress < 30 && '正在连接服务器...'}
        {syncProgress >= 30 && syncProgress < 60 && '正在下载邮件列表...'}
        {syncProgress >= 60 && syncProgress < 90 && '正在解析邮件内容...'}
        {syncProgress >= 90 && '即将完成...'}
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="onboarding-step">
      <h2>🎉 设置完成</h2>
      <p>您的邮件已成功同步到 MailMind</p>
      <p>AI 正在分析您的邮件，为您生成个性化推荐...</p>
      
      <button className="btn-primary" onClick={onComplete}>
        进入 MailMind
      </button>
    </div>
  );

  return (
    <div className="onboarding-wizard">
      <div className="progress-dots">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} />
        ))}
      </div>
      
      {step === 0 && renderWelcome()}
      {step === 1 && renderAccountConfig()}
      {step === 2 && renderSyncProgress()}
      {step === 3 && renderComplete()}
    </div>
  );
};

export default OnboardingWizard;
