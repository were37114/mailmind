import React from 'react';

export interface ModelLoadingIndicatorProps {
  message?: string;
}

const ModelLoadingIndicator: React.FC<ModelLoadingIndicatorProps> = ({ 
  message = 'AI 分析中...' 
}) => {
  return (
    <div className="model-loading-indicator" role="status" aria-label={message}>
      <div className="model-loading-indicator__spinner" />
      <span className="model-loading-indicator__text">{message}</span>
    </div>
  );
};

export default ModelLoadingIndicator;
