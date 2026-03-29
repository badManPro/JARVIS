import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('neo-panel p-6 text-[color:var(--neo-foreground)]', className)} {...props} />;
}

export function SectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-xl font-semibold tracking-[-0.04em] text-[color:var(--neo-foreground-strong)]', className)} {...props} />;
}

export function Muted({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6 text-[color:var(--neo-muted)]', className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('neo-chip px-3 py-1 text-xs font-medium', className)} {...props} />;
}
