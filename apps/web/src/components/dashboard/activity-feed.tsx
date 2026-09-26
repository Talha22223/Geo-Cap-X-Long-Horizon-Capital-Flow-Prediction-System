'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ActivityItem } from '../../lib/hooks/useRecentActivity';
import {
  Eye,
  Download,
  Bookmark,
  Share2,
  Plus,
  Trash2,
  Bell,
} from 'lucide-react';

const TYPE_CONFIG: Record<ActivityItem['type'], { icon: React.ElementType; color: string; bg: string }> = {
  view: { icon: Eye, color: 'text-slate-400', bg: 'bg-slate-800' },
  export: { icon: Download, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  save: { icon: Bookmark, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  share: { icon: Share2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  create: { icon: Plus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  alert: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  limit?: number;
}

export function ActivityFeed({ items, limit = 6 }: ActivityFeedProps) {
  const displayed = items.slice(0, limit);

  return (
    <ul className="space-y-0 divide-y divide-slate-800/50">
      {displayed.map((item, i) => {
        const cfg = TYPE_CONFIG[item.type];
        const IconComponent = cfg.icon;
        const content = (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 py-3 group hover:bg-slate-900/30 px-3 -mx-3 rounded-lg transition-colors"
          >
            <div className={`flex-shrink-0 mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
              <IconComponent className={`h-3.5 w-3.5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 font-medium leading-snug group-hover:text-white transition-colors truncate">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-slate-600 mt-0.5 truncate">{item.description}</p>
              )}
            </div>
            <span className="flex-shrink-0 text-[10px] text-slate-600 mt-1">{timeAgo(item.timestamp)}</span>
          </motion.li>
        );

        return item.href ? (
          <Link key={item.id} href={item.href}>{content}</Link>
        ) : (
          <React.Fragment key={item.id}>{content}</React.Fragment>
        );
      })}
    </ul>
  );
}
