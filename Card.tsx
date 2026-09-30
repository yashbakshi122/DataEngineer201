import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export const Card = ({ children, hoverable = false, className = '', ...props }: CardProps) => {
  return (
    <div className={`card ${hoverable ? 'card-hover' : ''} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
