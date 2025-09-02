/**
 * 路由索引文件
 */

import { Router } from 'express';
import projectRoutes from './project.routes';
import moduleRoutes from './module.routes';
import useCaseRoutes from './useCase.routes';
import sequenceRoutes from './sequence.routes';
import apiContractRoutes from './apiContract.routes';
import dtoSchemaRoutes from './dtoSchema.routes';
import apiSequenceLinkRoutes from './apiSequenceLink.routes';
import apiDtoLinkRoutes from './apiDtoLink.routes';
import catalogRoutes from './catalog.routes';
import searchRoutes from './search.routes';
import consistencyRoutes from './consistency.routes';
import aiRoutes from './ai.routes';

// 匯出實作的路由
export { 
  projectRoutes, 
  moduleRoutes, 
  useCaseRoutes, 
  sequenceRoutes,
  apiContractRoutes as apiRoutes,
  dtoSchemaRoutes as dtoRoutes
};
export { catalogRoutes };
export { searchRoutes };
export { consistencyRoutes };
export { aiRoutes };

// Link routes
export const linkRoutes = {
  apiSequenceRouter: apiSequenceLinkRoutes,
  apiDtoRouter: apiDtoLinkRoutes,
};

// Export/Import routes
import { exportRouter, importRouter } from './exportImport.routes';
import statisticsRoutes from './statistics.routes';

export const exportImportRoutes = {
  exportRouter,
  importRouter,
};

export { statisticsRoutes };

// 為每個路由加入臨時的回應
const routes = [
  { name: 'projects', router: projectRoutes },
  { name: 'modules', router: moduleRoutes },
  { name: 'use-cases', router: useCaseRoutes },
  { name: 'sequences', router: sequenceRoutes },
  { name: 'apis', router: apiContractRoutes },
  { name: 'dtos', router: dtoSchemaRoutes },
  { name: 'catalog', router: catalogRoutes },
  { name: 'search', router: searchRoutes },
  { name: 'consistency', router: consistencyRoutes },
  { name: 'ai', router: aiRoutes },
  { name: 'api-sequence-links', router: apiSequenceLinkRoutes },
  { name: 'api-dto-links', router: apiDtoLinkRoutes },
  { name: 'export', router: exportImportRoutes.exportRouter },
  { name: 'import', router: exportImportRoutes.importRouter },
  { name: 'statistics', router: statisticsRoutes },
];

// 為每個路由加入基本的 GET 端點
routes.forEach(({ name, router }) => {
  router.get('/', (_req: any, res: any) => {
    res.json({
      message: `${name} API endpoint - Under construction`,
      status: 'not_implemented',
      timestamp: new Date().toISOString(),
    });
  });
});