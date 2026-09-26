import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async listReports(userId: string) {
    return this.prisma.savedReport.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createReport(userId: string, name: string, description?: string, config: any = {}) {
    return this.prisma.savedReport.create({
      data: {
        userId,
        name,
        description,
        config,
      },
    });
  }

  async getReport(userId: string, id: string) {
    const report = await this.prisma.savedReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.userId !== userId) {
      throw new ForbiddenException('You do not have access to this report');
    }
    return report;
  }

  async duplicateReport(userId: string, id: string) {
    const report = await this.getReport(userId, id);
    return this.prisma.savedReport.create({
      data: {
        userId,
        name: `${report.name} (Copy)`,
        description: report.description,
        config: report.config || {},
      },
    });
  }

  async deleteReport(userId: string, id: string) {
    const report = await this.getReport(userId, id);
    await this.prisma.savedReport.delete({ where: { id: report.id } });
    return { success: true };
  }

  async exportReport(userId: string, id: string, format: 'csv' | 'json' | 'pdf') {
    const report = await this.getReport(userId, id);
    const config = report.config as Record<string, any>;

    if (format === 'json') {
      return {
        title: report.name,
        exportedAt: new Date().toISOString(),
        config,
      };
    }

    if (format === 'csv') {
      // Return simple comma-separated key-value lines
      const lines = [
        ['Report Name', report.name],
        ['Description', report.description || ''],
        ['Exported At', new Date().toISOString()],
        [],
        ['Metric Key', 'Metric Value'],
      ];
      if (config) {
        Object.entries(config).forEach(([key, val]) => {
          lines.push([key, typeof val === 'object' ? JSON.stringify(val) : String(val)]);
        });
      }
      return lines.map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    if (format === 'pdf') {
      // Return HTML print template that browser/pdf generators render cleanly
      return `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1e293b; }
              h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
              .card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
            </style>
          </head>
          <body>
            <h1>${report.name}</h1>
            <div class="meta">Exported on: ${new Date().toLocaleDateString()}</div>
            <p>${report.description || 'No description provided.'}</p>
            <div class="card">
              <h3>Report Configuration & Parameters</h3>
              <pre>${JSON.stringify(config, null, 2)}</pre>
            </div>
          </body>
        </html>
      `;
    }
  }
}
