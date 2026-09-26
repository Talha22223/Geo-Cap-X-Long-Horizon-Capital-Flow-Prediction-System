import * as React from 'react';
import { cn } from '../utils';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-slate-800/80 border border-slate-700/10', className)}
      {...props}
    />
  );
};
