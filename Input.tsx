import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-input ${error ? 'border-danger' : ''} ${className}`.trim()}
          style={error ? { borderColor: 'var(--danger-solid)' } : undefined}
          {...props}
        />
        {error && <span className="form-error">{error}</span>}
        {!error && helperText && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
