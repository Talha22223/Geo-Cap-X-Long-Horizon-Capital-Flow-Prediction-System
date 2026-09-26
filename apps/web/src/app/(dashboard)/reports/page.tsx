'use client';

import React from 'react';
import { PageHeader } from '../../../components/dashboard/page-header';
import { ReportRow } from '../../../components/dashboard/report-row';
import { useReports } from '../../../lib/hooks/useReports';
import { FileText, Download, Clock, Layout, Plus } from 'lucide-react';

const TABS = ['Recent', 'Saved', 'Export History', 'Templates'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = React.useState('Recent');
  const { data, isLoading } = useReports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved Reports"
        description="Access, manage, and export your capital flow analysis reports"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold transition-colors">
            <Plus className="h-3 w-3" /> New Report
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800/60">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Recent' || activeTab === 'Saved' ? (
        <div className="space-y-3">
          {isLoading ? (
            Array(3).fill(null).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-900/40 animate-pulse border border-slate-200 dark:border-slate-800/60" />
            ))
          ) : data?.reports && data.reports.length > 0 ? (
            data.reports.map((report, i) => (
              <ReportRow key={report.id} report={report} index={i} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent shadow-sm dark:shadow-none">
              <FileText className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No saved reports yet</p>
              <p className="text-xs text-slate-500 max-w-sm">Generate analysis reports from Capital Flows or AI Predictions to save and export them here.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'Templates' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data?.templates.map((tmpl) => (
            <div key={tmpl.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none transition-all cursor-pointer group">
              <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Layout className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{tmpl.name}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 mb-3 leading-relaxed">{tmpl.description}</p>
              <div className="flex flex-wrap gap-1">
                {tmpl.fields.map((f) => (
                  <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Download className="h-5 w-5 text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">No exports yet</p>
          <p className="text-xs text-slate-500 max-w-xs">Export history will appear here after you download reports.</p>
        </div>
      )}
    </div>
  );
}
