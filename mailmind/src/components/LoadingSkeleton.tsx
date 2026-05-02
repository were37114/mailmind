import React from 'react';

export interface LoadingSkeletonProps {
  count?: number;
  type?: 'line' | 'card';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'line' }) => {
  return (
    <div className="loading-skeleton" role="status" aria-label="加载中">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton skeleton--${type}`} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
