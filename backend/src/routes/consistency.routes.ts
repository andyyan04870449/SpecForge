/**
 * Consistency 路由定義
 */

import { Router } from 'express';
import { ConsistencyController } from '../controllers/consistency.controller';

const router = Router();
const consistencyController = new ConsistencyController();

// 執行一致性檢查
router.post('/check', consistencyController.checkProject);

// 取得最近的檢查報告
router.get('/check/:projectId/latest', consistencyController.getLatestReport);

// 取得檢查規則列表
router.get('/rules', consistencyController.getRules);

export default router;