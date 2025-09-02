/**
 * 統計路由
 */

import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';

const router = Router();
const statisticsController = new StatisticsController();

// 取得專案統計資訊
router.get('/:projectId', statisticsController.getProjectStatistics);

export default router;