'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Download, Clock, CheckCircle2, Loader2, XCircle, Pin } from 'lucide-react';
import type { Report } from '../../lib/hooks/useReports';

const STATUS_CONFIG: Record<Report['status'], { icon: React.ElementType; color: string; label: string }> = {
  ready: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Ready' },
  generating: { icon: Loader2, color: 'text-amber-400', label: 'Generating' },
  failed: { icon: XCircle, color: 'text-rose-400', label: 'Failed' },
  scheduled: { icon: Clock, color: 'text-slate-400', label: 'Scheduled' },
};

const TYPE_COLORS: Record<Report['type'], string> = {
  'capital-flow': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'macro': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'technical': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'prediction': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'custom': 'text-slate-400 bg-slate-800 border-slate-700',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ReportRowProps {
  report: Report;
  index?: number;
}

export function ReportRow({ report, index = 0 }: ReportRowProps) {
  const status = STATUS_CONFIG[report.status];
  const StatusIcon = status.icon;
  const typeColor = TYPE_COLORS[report.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700/50 shadow-sm dark:shadow-none transition-all group"
    >
      {/* Icon */}
      <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{report.title}</p>
          {report.isPinned && <Pin className="h-3 w-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${typeColor}`}>
            {report.type.replace('-', ' ')}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase">{report.format}</span>
          {report.size && <span className="text-[10px] text-slate-500 dark:text-slate-500">{report.size}</span>}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(report.createdAt)}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5">
        <StatusIcon className={`h-3.5 w-3.5 ${status.color} ${report.status === 'generating' ? 'animate-spin' : ''}`} />
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>

      {/* Download action */}
      {report.status === 'ready' && (
        <button
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          aria-label="Download report"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
