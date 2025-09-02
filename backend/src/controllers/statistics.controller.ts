/**
 * 統計控制器
 */

import { Request, Response, NextFunction } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { prisma } from '../config/database';

export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = new StatisticsService(prisma);
  }

  /**
   * 取得專案統計資訊
   */
  getProjectStatistics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { simple } = req.query;

      let statistics;
      if (simple === 'true') {
        statistics = await this.statisticsService.getSimpleStatistics(projectId);
      } else {
        statistics = await this.statisticsService.getProjectStatistics(projectId);
      }

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default StatisticsController;