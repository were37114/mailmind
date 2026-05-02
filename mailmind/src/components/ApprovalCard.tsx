import React, { useState } from 'react';
import UrgencyIndicator from './UrgencyIndicator';
import type { ApprovalItem } from '../core/approval/approval-service';

export interface ApprovalCardProps {
  item: ApprovalItem;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
  onDelegate: (item: ApprovalItem) => void;
  onDefer: (item: ApprovalItem) => void;
}

const CONFIDENCE_LEVELS = {
  high: { label: '高置信', icon: '🛡️', className: 'confidence-high' },
  medium: { label: '中置信', icon: '⚠️', className: 'confidence-medium' },
  low: { label: '低置信', icon: '❓', className: 'confidence-low' },
} as const;

function getConfidenceLevel(confidence: number): keyof typeof CONFIDENCE_LEVELS {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({ item, onApprove, onReject, onDelegate, onDefer }) => {
  const [expanded, setExpanded] = useState(false);
  const level = getConfidenceLevel(item.confidence);
  const conf = CONFIDENCE_LEVELS[level];

  return (
    <div className={`approval-card approval-card--${item.email.urgency === 2 ? 'urgent' : 'normal'}`}>
      <div className="approval-card__header">
        <span className="approval-card__subject">{item.email.subject}</span>
        <div className="approval-card__badges">
          <span className={`confidence-badge ${conf.className}`}>
            {conf.icon} {conf.label}
          </span>
          <UrgencyIndicator urgency={item.email.urgency} />
        </div>
      </div>

      <div className="approval-card__meta">
        <span>发件人: {item.email.from_name} &lt;{item.email.from_email}&gt;</span>
        <span>{new Date(item.email.date).toLocaleDateString('zh-CN')}</span>
      </div>

      {item.amount && (
        <div className="approval-card__detail">💰 金额: {item.amount}</div>
      )}
      {item.deadline && (
        <div className="approval-card__detail">⏰ 截止: {item.deadline}</div>
      )}

      <button className="approval-card__expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起 ▲' : '展开预览 ▼'}
      </button>

      {expanded && (
        <div className="approval-card__preview">
          <p>{item.email.body_text.slice(0, 300)}{item.email.body_text.length > 300 ? '...' : ''}</p>
        </div>
      )}

      <div className="approval-card__actions">
        <button className="btn-success" onClick={() => onApprove(item)}>✅ 通过</button>
        <button className="btn-danger" onClick={() => onReject(item)}>❌ 驳回</button>
        <button className="btn-secondary" onClick={() => onDelegate(item)}>🔄 转交</button>
        <button className="btn-secondary" onClick={() => onDefer(item)}>⏸️ 暂缓</button>
      </div>

      <div className="approval-card__status">
        状态: {
          item.status === 'pending' ? '待处理' :
          item.status === 'approved' ? '已通过' :
          item.status === 'rejected' ? '已驳回' :
          item.status === 'delegated' ? '已转交' :
          item.status === 'deferred' ? '已暂缓' : item.status
        }
      </div>
    </div>
  );
};

export default ApprovalCard;
