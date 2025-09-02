/**
 * Catalog 路由定義
 */

import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller';

const router = Router();
const catalogController = new CatalogController();

// 專案完整目錄
router.get('/projects/:projectId', catalogController.getProjectCatalog);

// 模組目錄
router.get('/projects/:projectId/modules', catalogController.getModuleCatalog);

// API 目錄
router.get('/projects/:projectId/apis', catalogController.getApiCatalog);

// DTO 目錄
router.get('/projects/:projectId/dtos', catalogController.getDtoCatalog);

export default router;