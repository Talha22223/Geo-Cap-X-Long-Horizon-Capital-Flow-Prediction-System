'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../../components/dashboard/page-header';
import { useNotificationStore } from '../../../lib/store/notificationStore';
import { HelpCircle, Book, MessageCircle, Mail, Send, ExternalLink } from 'lucide-react';

const HELP_LINKS = [
  { icon: Book, title: 'Documentation', description: 'Guides, API reference, and tutorials', href: '#' },
  { icon: MessageCircle, title: 'Community Forum', description: 'Ask questions and share insights', href: '#' },
  { icon: ExternalLink, title: 'Release Notes', description: 'What\'s new in each version', href: '#' },
];

export default function SupportPage() {
  const { addToast } = useNotificationStore();
  const [form, setForm] = React.useState({ subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      addToast({ type: 'error', message: 'Please fill in both fields before submitting.' });
      return;
    }
    addToast({ type: 'success', title: 'Message sent', message: 'Our team will respond within 24 hours.' });
    setForm({ subject: '', message: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Get help with GeoCap-X or contact our team"
      />

      {/* Help resources */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {HELP_LINKS.map((link, i) => (
          <motion.a
            key={link.title}
            href={link.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm dark:shadow-none transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <link.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{link.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.description}</p>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Contact form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/50 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Contact Support</h2>
            <p className="text-xs text-slate-500">We respond within 24 hours on business days</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Briefly describe your issue"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm dark:shadow-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={5}
              placeholder="Describe your issue in detail..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all resize-none shadow-sm dark:shadow-none"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20">
              <Send className="h-4 w-4" /> Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
