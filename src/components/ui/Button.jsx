import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-opacity-40';

const variants = {
  primary:
    `bg-[color:var(--accent)] text-white hover:opacity-90 rounded-2xl px-5 py-2.5 font-medium shadow-sm transition-colors duration-150 ${focusRing}`,
  secondary:
    `bg-card border border-border text-fg hover:bg-card2 rounded-2xl px-5 py-2.5 font-medium transition-colors duration-150 ${focusRing}`,
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
