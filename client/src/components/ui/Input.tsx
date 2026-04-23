import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium tracking-widest uppercase text-agence-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full bg-agence-dark border rounded px-4 py-3 text-agence-cream placeholder-agence-subtle text-sm',
            'focus:outline-none focus:border-agence-gold transition-colors duration-150',
            error ? 'border-agence-error' : 'border-agence-border',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-agence-error-light">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
