import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  primary:
    'bg-accent text-white hover:bg-accent-600 focus-visible:ring-2 focus-visible:ring-accent/40 rounded-2xl px-5 py-2.5 font-medium shadow-sm transition-colors duration-150',
  secondary:
    'bg-card border border-border text-fg hover:bg-card2 focus-visible:ring-2 focus-visible:ring-accent/20 rounded-2xl px-5 py-2.5 font-medium transition-colors duration-150',
};

export const Button = forwardRef(function Button(
  { as: AsComponent = 'button', variant = 'primary', className, ...props },
  ref
) {
  const Component = AsComponent;
  return (
    <Component ref={ref} className={cn(variants[variant], className)} {...props} />
  );
});
