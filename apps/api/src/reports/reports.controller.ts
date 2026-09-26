/**
 * ============================================================================
 * SAVED REPORTS CONTROLLER (ReportsController)
 * ============================================================================
 * WHAT:
 *   Manages customized analytical reports and research exports:
 *   - GET    /api/v1/reports: Lists saved reports for the authenticated user
 *   - POST   /api/v1/reports: Saves a new custom report configuration
 *   - GET    /api/v1/reports/:id: Retrieves report configuration and data
 *   - DELETE /api/v1/reports/:id: Removes saved report
 *   - GET    /api/v1/reports/:id/export: Exports report as CSV format
 *
 * WHY:
 *   Allows hedge funds, analysts, and enterprise users to bookmark customized
 *   forecast scenarios and download datasets for internal presentation and compliance.
 * ============================================================================
 */

import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  config?: any;
}

@ApiTags('Saved Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all saved reports for the authenticated user' })
  async list(@Req() req: any) {
    return this.reportsService.listReports(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new report configuration' })
  async create(@Req() req: any, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(req.user.id, dto.name, dto.description, dto.config);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing saved report' })
  async duplicate(@Req() req: any, @Param('id') id: string) {
    return this.reportsService.duplicateReport(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved report' })
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.reportsService.deleteReport(req.user.id, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export saved report data as CSV, JSON, or PDF' })
  async export(
    @Req() req: any,
    @Param('id') id: string,
    @Query('format') format: 'csv' | 'json' | 'pdf',
    @Res() res: Response
  ) {
    const result = await this.reportsService.exportReport(req.user.id, id, format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.json`);
      return res.send(result);
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);
      return res.send(result);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'text/html'); // Return print-ready HTML
      return res.send(result);
    }

    return res.status(400).json({ success: false, message: 'Invalid format selection' });
  }
}
