import React from 'react';

export interface ModelDownloadProgressProps {
  modelName: string;
  totalBytes: number;
  downloadedBytes: number;
  status: 'downloading' | 'paused' | 'complete' | 'error';
  speed?: number; // bytes/sec
  errorMessage?: string;
  onRetry?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatSpeed = (bytesPerSec: number): string => `${formatBytes(bytesPerSec)}/s`;

const ModelDownloadProgress: React.FC<ModelDownloadProgressProps> = ({
  modelName,
  totalBytes,
  downloadedBytes,
  status,
  speed,
  errorMessage,
  onRetry,
}) => {
  const percent = totalBytes > 0 ? Math.min((downloadedBytes / totalBytes) * 100, 100) : 0;
  const remaining = speed ? (totalBytes - downloadedBytes) / speed : null;

  return (
    <div className="model-download-progress">
      <p className="model-download-name">
        📦 下载 {modelName} ({formatBytes(totalBytes)})
      </p>

      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>

      <div className="model-download-stats">
        <span>{formatBytes(downloadedBytes)} / {formatBytes(totalBytes)} ({percent.toFixed(1)}%)</span>
        {speed && <span>{formatSpeed(speed)}</span>}
        {remaining !== null && remaining > 0 && (
          <span>预计剩余 {Math.ceil(remaining / 60)} 分钟</span>
        )}
      </div>

      {status === 'error' && (
        <div className="model-download-error">
          <p>❌ 下载失败: {errorMessage ?? '网络错误'}</p>
          {onRetry && <button className="btn-secondary" onClick={onRetry}>稍后重试</button>}
        </div>
      )}
    </div>
  );
};

export default ModelDownloadProgress;
