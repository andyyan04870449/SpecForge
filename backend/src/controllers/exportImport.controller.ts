/**
 * Export/Import Controller
 */

import { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service';
import { ImportService } from '../services/import.service';
import { prisma } from '../config/database';

export class ExportImportController {
  private exportService: ExportService;
  private importService: ImportService;

  constructor() {
    this.exportService = new ExportService(prisma);
    this.importService = new ImportService(prisma);
  }

  /**
   * 匯出專案（JSON）
   */
  exportProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.body;
      const { includeLinks, includeTimestamps, format } = req.query;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_INVALID_INPUT',
            message: 'Project ID is required',
          },
        });
        return;
      }

      const options = {
        includeLinks: includeLinks !== 'false',
        includeTimestamps: includeTimestamps === 'true',
        exportedBy: req.headers['x-user-id'] as string,
      };

      if (format === 'openapi') {
        const openApiSpec = await this.exportService.exportOpenAPI(projectId);
        res.json({
          success: true,
          data: openApiSpec,
        });
      } else if (format === 'markdown') {
        const markdown = await this.exportService.exportMarkdown(projectId);
        res.type('text/markdown').send(markdown);
      } else {
        const exportData = await this.exportService.exportProject(projectId, options);
        res.json({
          success: true,
          data: exportData,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 驗證匯入資料
   */
  validateImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      
      const validation = await this.importService.validateImportData(data);
      
      res.json({
        success: validation.valid,
        data: {
          valid: validation.valid,
          errors: validation.errors,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 匯入專案
   */
  importProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const { overwrite, generateNewCodes, skipValidation } = req.query;
      
      const options = {
        overwrite: overwrite === 'true',
        generateNewCodes: generateNewCodes === 'true',
        skipValidation: skipValidation === 'true',
        importedBy: req.headers['x-user-id'] as string,
      };

      const result = await this.importService.importProject(data, options);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'BIZ_IMPORT_FAILED',
            message: 'Import failed',
            details: result,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };
}

export default ExportImportController;