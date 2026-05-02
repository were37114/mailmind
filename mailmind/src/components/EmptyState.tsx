import React from 'react';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {actionLabel && onAction && (
        <button className="btn-primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
};

export default EmptyState;
