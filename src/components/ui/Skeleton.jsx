import { cn } from '../../lib/cn';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-xl bg-border/50', className)} />;
}
