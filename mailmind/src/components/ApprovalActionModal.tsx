import React, { useState } from 'react';
import type { ApprovalItem } from '../core/approval/approval-service';

export interface ApprovalActionModalProps {
  item: ApprovalItem;
  action: 'approve' | 'reject' | 'delegate' | 'defer' | null;
  onConfirm: (item: ApprovalItem, action: string, detail?: string) => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  approve: '通过',
  reject: '驳回',
  delegate: '转交',
  defer: '暂缓',
};

const ApprovalActionModal: React.FC<ApprovalActionModalProps> = ({ item, action, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'preview' | 'action' | 'confirm' | 'done'>(
    action ? 'action' : 'preview'
  );
  const [detail, setDetail] = useState('');
  const [delegateTo, setDelegateTo] = useState('');

  if (!action) return null;

  // High-amount double confirmation
  const isHighAmount = item.amount && parseFloat(item.amount) > 100000;

  const handleAction = () => {
    if (action === 'delegate' && !delegateTo.trim()) return;
    if (isHighAmount && step === 'action') {
      setStep('confirm');
      return;
    }
    setStep('done');
    onConfirm(item, action, action === 'delegate' ? delegateTo : detail);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {step === 'preview' && (
          <>
            <h3>📋 预览邮件</h3>
            <div className="modal-preview">
              <p><strong>主题:</strong> {item.email.subject}</p>
              <p><strong>发件人:</strong> {item.email.from_name}</p>
              <p><strong>AI摘要:</strong> {item.email.body_text.slice(0, 200)}...</p>
              {item.amount && <p><strong>金额:</strong> {item.amount}</p>}
              {item.deadline && <p><strong>截止:</strong> {item.deadline}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setStep('action')}>继续操作</button>
              <button className="btn-secondary" onClick={onCancel}>取消</button>
            </div>
          </>
        )}

        {step === 'action' && (
          <>
            <h3>{ACTION_LABELS[action]} — {item.email.subject}</h3>
            {action === 'reject' && (
              <div className="form-group">
                <label>驳回原因（可选）</label>
                <textarea value={detail} onChange={e => setDetail(e.target.value)} />
              </div>
            )}
            {action === 'delegate' && (
              <div className="form-group">
                <label>转交给 *</label>
                <input value={delegateTo} onChange={e => setDelegateTo(e.target.value)} placeholder="输入接收人邮箱" />
              </div>
            )}
            {action === 'defer' && (
              <div className="form-group">
                <label>暂缓备注（可选）</label>
                <textarea value={detail} onChange={e => setDetail(e.target.value)} />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleAction}>
                确认{ACTION_LABELS[action]}
              </button>
              <button className="btn-secondary" onClick={onCancel}>取消</button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h3>⚠️ 二次确认</h3>
            <p>此审批涉及金额 <strong>{item.amount}</strong>，请再次确认操作。</p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={() => { setStep('done'); onConfirm(item, action, detail); }}>
                确认{ACTION_LABELS[action]}
              </button>
              <button className="btn-secondary" onClick={onCancel}>取消</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <h3>✅ 操作完成</h3>
            <p>已{ACTION_LABELS[action]}: {item.email.subject}</p>
            <p className="modal-hint">审计日志已记录此操作</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onCancel}>关闭</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovalActionModal;
