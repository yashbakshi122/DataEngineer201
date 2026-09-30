import { type ReactNode } from 'react';

export type BadgeVariant =
  | 'draft'
  | 'published'
  | 'completed'
  | 'cancelled'
  | 'going'
  | 'maybe'
  | 'not-going'
  | 'waitlist'
  | 'checked-in'
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  icon?: ReactNode;
}

export const Badge = ({ variant = 'default', children, icon }: BadgeProps) => {
  const variantClass = variant === 'default' ? 'badge-draft' : `badge-${variant}`;

  return (
    <span className={`badge ${variantClass}`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};
