import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:
    'bg-agence-gold text-agence-black hover:bg-agence-gold-light active:bg-agence-gold-dim font-semibold',
  secondary:
    'bg-transparent border border-agence-border text-agence-cream hover:border-agence-gold hover:text-agence-gold',
  ghost:
    'bg-transparent text-agence-muted hover:text-agence-cream hover:bg-agence-card',
  danger:
    'bg-transparent border border-agence-error text-agence-error hover:bg-agence-error hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-agence-gold/50 disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
