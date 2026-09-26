import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@geocap-x/ui';
import { Skeleton } from '@geocap-x/ui';
import { BarChart3, AlertCircle } from 'lucide-react';

interface ChartWrapperProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  description,
  isLoading = false,
  error,
  children,
  action,
  className,
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-200/80 dark:border-slate-800/40">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="pt-6 min-h-[300px] flex items-center justify-center relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center space-y-2 p-6 text-rose-500">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <h4 className="font-semibold text-slate-900 dark:text-white">Failed to load chart</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">{error}</p>
          </div>
        ) : (
          <div className="w-full h-full min-h-[250px]">{children}</div>
        )}
      </CardContent>
    </Card>
  );
};
