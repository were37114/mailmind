import React from 'react';

interface UrgencyIndicatorProps {
  urgency: number;
}

const urgencyConfig: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: '低', color: '#9e9e9e', icon: '○' },
  1: { label: '中', color: '#ff9800', icon: '◐' },
  2: { label: '高', color: '#f44336', icon: '●' },
};

const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({ urgency }) => {
  const config = urgencyConfig[urgency] || urgencyConfig[0];

  return (
    <span
      className="urgency-indicator"
      style={{
        color: config.color,
        fontSize: '12px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
      title={`紧急程度: ${config.label}`}
    >
      <span style={{ fontSize: '14px' }}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export default UrgencyIndicator;
