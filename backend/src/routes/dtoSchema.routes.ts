/**
 * DTO Schema 路由定義
 */

import { Router } from 'express';
import { DtoSchemaController } from '../controllers/dtoSchema.controller';
import { validate } from '../middlewares/validate';
import {
  createDtoSchemaSchema,
  batchCreateDtoSchemasSchema,
  updateDtoSchemaSchema,
  listDtoSchemasSchema,
  idParamSchema,
  projectIdParamSchema,
  dtoCodeQuerySchema,
} from '../validations/dtoSchema.validation';

const router = Router();
const dtoSchemaController = new DtoSchemaController();

// 查詢所有 DTO Schemas
router.get(
  '/dto-schemas',
  validate(listDtoSchemasSchema),
  dtoSchemaController.findMany
);

// Project 相關路由 - /projects/:projectId/dtos
router.post(
  '/projects/:projectId/dtos',
  validate(createDtoSchemaSchema),
  dtoSchemaController.create
);

router.post(
  '/projects/:projectId/dtos/batch',
  validate(batchCreateDtoSchemasSchema),
  dtoSchemaController.batchCreate
);

router.get(
  '/projects/:projectId/dtos',
  validate(listDtoSchemasSchema),
  dtoSchemaController.findMany
);

router.get(
  '/projects/:projectId/dtos/stats',
  validate(projectIdParamSchema),
  dtoSchemaController.getStatistics
);

router.get(
  '/projects/:projectId/dtos/code/:dtoCode',
  validate(dtoCodeQuerySchema),
  dtoSchemaController.findByCode
);

// DTO 獨立路由 - /dtos/:id
router.get(
  '/dtos/:id',
  validate(idParamSchema),
  dtoSchemaController.findById
);

router.put(
  '/dtos/:id',
  validate(updateDtoSchemaSchema),
  dtoSchemaController.update
);

router.delete(
  '/dtos/:id',
  validate(idParamSchema),
  dtoSchemaController.delete
);

router.get(
  '/dtos/:id/typescript',
  validate(idParamSchema),
  dtoSchemaController.generateTypeScript
);

// 通用列表路由 - /dtos (支援跨專案查詢)
router.get(
  '/dtos',
  validate(listDtoSchemasSchema),
  dtoSchemaController.findMany
);

export default router;