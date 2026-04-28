import React from 'react';

interface CategoryBadgeProps {
  category: number;
  confidence?: number;
}

const categoryConfig: Record<number, { label: string; color: string; bgColor: string }> = {
  0: { label: '审批', color: '#e65100', bgColor: '#fff3e0' },
  1: { label: '通知', color: '#1565c0', bgColor: '#e3f2fd' },
  2: { label: '讨论', color: '#2e7d32', bgColor: '#e8f5e9' },
  3: { label: '汇报', color: '#6a1b9a', bgColor: '#f3e5f5' },
  4: { label: '其他', color: '#616161', bgColor: '#f5f5f5' },
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, confidence }) => {
  const config = categoryConfig[category] || categoryConfig[4];

  return (
    <span
      className="category-badge"
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        border: `1px solid ${config.color}20`,
      }}
    >
      {config.label}
      {confidence !== undefined && confidence < 0.8 && (
        <span style={{ opacity: 0.6, marginLeft: '4px' }}>
          {(confidence * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
};

export default CategoryBadge;
