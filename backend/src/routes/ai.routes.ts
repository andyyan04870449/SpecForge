/**
 * AI 路由定義
 */

import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';

const router = Router();
const aiController = new AiController();

// 生成內容
router.post('/generate', aiController.generate);

// 草稿管理
router.get('/drafts/:draftId', aiController.getDraft);
router.post('/adopt-draft', aiController.adoptDraft);
router.delete('/drafts/:draftId', aiController.deleteDraft);

// 模板
router.get('/templates', aiController.getTemplates);

// 建議功能
router.post('/suggest-apis', aiController.suggestApis);
router.post('/suggest-dtos', aiController.suggestDtos);

export default router;