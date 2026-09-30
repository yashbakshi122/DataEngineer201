import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ border: 'none' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              backgroundColor: 'var(--bg-subtle)',
              borderBottomLeftRadius: 'var(--radius-lg)',
              borderBottomRightRadius: 'var(--radius-lg)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
