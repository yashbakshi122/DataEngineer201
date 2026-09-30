interface LiveIndicatorProps {
  label?: string;
  subtext?: string;
}

export const LiveIndicator = ({ label = 'Live', subtext }: LiveIndicatorProps) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="live-badge">
        <span className="live-dot" />
        {label}
      </span>
      {subtext && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
};
