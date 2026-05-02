import React from 'react';

export interface SyncStatusProps {
  totalFetched: number;
  estimatedTotal?: number;
  status: 'idle' | 'syncing' | 'interrupted' | 'error';
  errorMessage?: string;
  lastSyncTime?: Date;
}

const SyncStatus: React.FC<SyncStatusProps> = ({
  totalFetched,
  estimatedTotal,
  status,
  errorMessage,
  lastSyncTime,
}) => {
  const progress = estimatedTotal ? Math.min((totalFetched / estimatedTotal) * 100, 100) : 0;

  return (
    <div className="sync-status-widget">
      {status === 'syncing' && (
        <>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="sync-progress-text">
            正在同步... {totalFetched} / {estimatedTotal ?? '???'} 封邮件
          </p>
        </>
      )}

      {status === 'idle' && lastSyncTime && (
        <p className="sync-idle-text">
          ✅ 上次同步: {lastSyncTime.toLocaleString('zh-CN')} — 共 {totalFetched} 封
        </p>
      )}

      {status === 'interrupted' && (
        <p className="sync-interrupted-text">
          ⚠️ 同步中断，将在下次启动时继续（已同步 {totalFetched} 封）
        </p>
      )}

      {status === 'error' && (
        <p className="sync-error-text">
          ❌ 同步失败: {errorMessage ?? '未知错误'}
        </p>
      )}
    </div>
  );
};

export default SyncStatus;
