import { type ReactNode } from 'react';
import { Card } from './Card';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  accentColor?: string;
}

export const KpiCard = ({ title, value, subtitle, icon, trend, accentColor }: KpiCardProps) => {
  return (
    <Card hoverable className="kpi-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {accentColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: accentColor,
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, letterSpacing: '-0.02em' }}>
            {value}
          </div>
        </div>
        {icon && (
          <div
            style={{
              padding: 10,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {(subtitle || trend) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
          {trend && (
            <span
              style={{
                fontWeight: 600,
                color: trend.positive ? 'var(--success-solid)' : 'var(--danger-solid)',
              }}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <span style={{ color: 'var(--text-muted)' }}>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};
