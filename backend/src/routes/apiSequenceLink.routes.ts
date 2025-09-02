/**
 * API-Sequence Link 路由定義
 */

import { Router } from 'express';
import { ApiSequenceLinkController } from '../controllers/apiSequenceLink.controller';
import { validate } from '../middlewares/validate';
import {
  createApiSequenceLinkSchema,
  batchCreateApiSequenceLinksSchema,
  updateApiSequenceLinkSchema,
  listApiSequenceLinksSchema,
  idParamSchema,
  apiIdParamSchema,
  sequenceIdParamSchema,
} from '../validations/link.validation';

const router = Router();
const controller = new ApiSequenceLinkController();

// 基本 CRUD
router.post(
  '/',
  validate(createApiSequenceLinkSchema),
  controller.create
);

router.post(
  '/batch',
  validate(batchCreateApiSequenceLinksSchema),
  controller.batchCreate
);

router.get(
  '/',
  validate(listApiSequenceLinksSchema),
  controller.findMany
);

router.get(
  '/:id',
  validate(idParamSchema),
  controller.findById
);

router.put(
  '/:id',
  validate(updateApiSequenceLinkSchema),
  controller.update
);

router.delete(
  '/:id',
  validate(idParamSchema),
  controller.delete
);

// 特殊查詢
router.get(
  '/api/:apiId/sequences',
  validate(apiIdParamSchema),
  controller.findSequencesByApi
);

router.get(
  '/sequence/:sequenceId/apis',
  validate(sequenceIdParamSchema),
  controller.findApisBySequence
);

// 自動偵測
router.post(
  '/sequence/:sequenceId/auto-detect',
  validate(sequenceIdParamSchema),
  controller.autoDetect
);

export default router;