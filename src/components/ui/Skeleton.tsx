import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] ${className || ''}`}
      {...props}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 bg-slate-400/10" />
        <Skeleton className="h-5 w-5 rounded-full bg-slate-400/10" />
      </div>
      <div>
        <Skeleton className="h-8 w-16 bg-slate-100/10 mb-1" />
        <Skeleton className="h-3 w-32 bg-slate-400/10" />
      </div>
    </div>
  );
}

export function TripItemSkeleton() {
  return (
    <div className="glass-card mb-4 overflow-hidden border border-white/[0.05] bg-white/[0.02]">
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Top bar with badge and date/time info */}
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full bg-slate-500/15" />
            <Skeleton className="h-4 w-12 bg-slate-500/15" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3 w-16 bg-slate-500/10 hidden sm:block" />
              <Skeleton className="h-5 w-14 bg-slate-400/15" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full bg-slate-500/10" />
          </div>
        </div>

        {/* User name / description and directions */}
        <div className="flex flex-col gap-3 pl-0 sm:pl-8">
          <div>
            <Skeleton className="h-3 w-36 bg-slate-500/15" />
          </div>
          
          <div className="space-y-2 mt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Skeleton className="h-4 w-3/4 sm:w-1/3 bg-slate-300/10" />
              <div className="hidden sm:block">
                <Skeleton className="h-3 w-4 bg-slate-600/15" />
              </div>
              <Skeleton className="h-4 w-2/3 sm:w-1/3 bg-slate-300/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveDriverItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-white/[0.05] bg-white/[0.01]">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="h-10 w-10 rounded-xl bg-slate-500/15" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 bg-slate-300/15" />
          <Skeleton className="h-3 w-20 bg-slate-500/10" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full bg-emerald-500/10" />
    </div>
  );
}

export function SystemLogSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-2 p-2 bg-white/[0.01] rounded">
          <Skeleton className="h-3.5 w-12 bg-amber-500/10" />
          <Skeleton className="h-3.5 w-5/6 bg-slate-300/10" />
        </div>
      ))}
    </div>
  );
}
