/**
 * Export/Import 路由定義
 */

import { Router } from 'express';
import { ExportImportController } from '../controllers/exportImport.controller';

const exportRouter = Router();
const importRouter = Router();
const controller = new ExportImportController();

// Export routes
exportRouter.post('/project', controller.exportProject);

// Import routes
importRouter.post('/validate', controller.validateImport);
importRouter.post('/project', controller.importProject);

export { exportRouter, importRouter };