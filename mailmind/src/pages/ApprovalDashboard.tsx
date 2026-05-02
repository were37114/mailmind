import React, { useState, useEffect } from 'react';
import { approvalEngine, type ApprovalItem } from '../core/approval/approval-service';
import { auditLog } from '../core/approval/audit-log';
import ApprovalCard from '../components/ApprovalCard';
import ApprovalActionModal from '../components/ApprovalActionModal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const ApprovalDashboard: React.FC = () => {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{
    item: ApprovalItem;
    action: 'approve' | 'reject' | 'delegate' | 'defer';
  } | null>(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const result = await approvalEngine.getPendingApprovals();
      setItems(result);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (item: ApprovalItem, action: string, detail?: string) => {
    const operator = 'current_user';
    switch (action) {
      case 'approve':
        approvalEngine.approve(item, operator);
        auditLog.append(item.email.id, 'approved', operator, 'Approved');
        break;
      case 'reject':
        approvalEngine.reject(item, operator, detail);
        auditLog.append(item.email.id, 'rejected', operator, detail || 'Rejected');
        break;
      case 'delegate':
        approvalEngine.delegate(item, operator, detail || '');
        auditLog.append(item.email.id, 'delegated', operator, `Delegated to ${detail}`);
        break;
      case 'defer':
        approvalEngine.defer(item, operator);
        auditLog.append(item.email.id, 'deferred', operator, detail || 'Deferred');
        break;
    }
    setActiveAction(null);
    // Refresh list
    setItems(prev => prev.filter(i => i.email.id !== item.email.id));
  };

  if (loading) {
    return (
      <div className="approval-dashboard">
        <h2>审批汇总</h2>
        <LoadingSkeleton count={3} type="card" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="approval-dashboard">
        <h2>审批汇总</h2>
        <EmptyState
          icon="✅"
          title="暂无待审批"
          description="所有审批邮件已处理完毕"
          actionLabel="刷新"
          onAction={loadApprovals}
        />
      </div>
    );
  }

  return (
    <div className="approval-dashboard">
      <div className="approval-dashboard__header">
        <h2>审批汇总</h2>
        <span className="approval-dashboard__count">{items.length} 封待处理</span>
      </div>

      <div className="approval-list">
        {items.map(item => (
          <ApprovalCard
            key={item.email.id}
            item={item}
            onApprove={i => setActiveAction({ item: i, action: 'approve' })}
            onReject={i => setActiveAction({ item: i, action: 'reject' })}
            onDelegate={i => setActiveAction({ item: i, action: 'delegate' })}
            onDefer={i => setActiveAction({ item: i, action: 'defer' })}
          />
        ))}
      </div>

      {activeAction && (
        <ApprovalActionModal
          item={activeAction.item}
          action={activeAction.action}
          onConfirm={handleAction}
          onCancel={() => setActiveAction(null)}
        />
      )}
    </div>
  );
};

export default ApprovalDashboard;
