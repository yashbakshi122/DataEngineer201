import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            padding: 10,
            borderRadius: '50%',
            backgroundColor: variant === 'danger' ? 'var(--danger-bg)' : 'var(--accent-primary-light)',
            color: variant === 'danger' ? 'var(--danger-solid)' : 'var(--accent-primary)',
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{message}</p>
      </div>
    </Modal>
  );
};
