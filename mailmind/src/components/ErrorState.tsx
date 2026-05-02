import React from 'react';

export interface ErrorStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ icon = '❌', title, message, actionLabel, onAction }) => {
  return (
    <div className="error-state">
      <div className="error-state__icon">{icon}</div>
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__message">{message}</p>
      {actionLabel && onAction && (
        <button className="btn-secondary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
};

export default ErrorState;
