/**
 * Consistency Controller
 */

import { Request, Response, NextFunction } from 'express';
import { ConsistencyCheckerService } from '../services/consistencyChecker.service';
import { prisma } from '../config/database';

export class ConsistencyController {
  private consistencyService: ConsistencyCheckerService;
  private reportCache: Map<string, any> = new Map();

  constructor() {
    this.consistencyService = new ConsistencyCheckerService(prisma);
  }

  /**
   * 執行一致性檢查
   */
  checkProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.body;
      
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
      
      const report = await this.consistencyService.checkProject(projectId);
      
      // 快取報告
      this.reportCache.set(`${projectId}-latest`, report);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得最近的檢查報告
   */
  getLatestReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const report = this.reportCache.get(`${projectId}-latest`);
      
      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            code: 'BIZ_NOT_FOUND',
            message: 'No consistency check report found for this project',
          },
        });
        return;
      }
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取得檢查規則列表
   */
  getRules = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rules = this.consistencyService.getRules();
      
      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ConsistencyController;